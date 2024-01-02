from flask import Flask, jsonify, render_template, request, send_from_directory
from werkzeug.utils import secure_filename
import subprocess
import threading
import time
import os
import re

app = Flask(__name__)

printer_ip = '192.168.1.50'
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/get-printer-ip', methods=['GET'])
def get_printer_ip():
    try:
        with open('printer_ip.txt', 'r') as file:
            ip = file.read().strip()
            print(f"Adresse IP lue : {ip}")  # Pour le débogage
            return ip
    except Exception as e:
        print(f"Erreur lors de la lecture de l'adresse IP : {e}")  # Pour le débogage
        return None


@app.route('/set-printer-ip', methods=['POST'])
def set_printer_ip():
    try:
        new_ip = request.json.get('ip')
        print(f"Tentative de mise à jour de l'adresse IP de l'imprimante : {new_ip}")
        with open('printer_ip.txt', 'w') as file:
            file.write(new_ip)
        print("L'adresse IP de l'imprimante a été mise à jour.")
        return jsonify({'message': 'IP updated'})
    except Exception as e:
        print(f"Erreur lors de la mise à jour de l'adresse IP : {e}")
        return jsonify({'error': str(e)})



@app.route('/print-status')
def print_status():
    printer_ip = get_printer_ip()
    if printer_ip is None:
        return jsonify({'error': 'L\'adresse IP de l\'imprimante n\'a pas pu être lue.'})

    try:
        cmd = ['./cassini.py', '-p', printer_ip, 'status']
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = result.stdout.strip()

        match = re.search(r'Layers: (\d+)/(\d+)', output)
        if match:
            current_layer, total_layers = match.groups()
            progress = (int(current_layer) / int(total_layers)) * 100
        else:
            current_layer, total_layers, progress = 'N/A', 'N/A', 0

        return jsonify({
            'status': output,
            'current_layer': current_layer,
            'total_layers': total_layers,
            'progress': progress
        })
    except Exception as e:
        return jsonify({'error': str(e)})



@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({'message': 'File uploaded successfully', 'filename': filename})
    return jsonify({'error': 'No file'})


@app.route('/files')
def list_files():
    files = os.listdir(app.config['UPLOAD_FOLDER'])
    files_info = []
    for file in files:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file)
        size = os.path.getsize(filepath) / (1024 * 1024)  # Convertir en mégaoctets
        files_info.append({'name': file, 'size': round(size, 2)})  # Arrondir à deux décimales
    return jsonify(files_info)


def run_command(cmd, on_complete=None, *args):
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    for line in iter(process.stdout.readline, ''):
        print(line, end='')
        if "100%" in line:
            break

    process.terminate()

    if on_complete:
        on_complete(*args)


progress_status = {}

def print_file_after_upload(filename):
    printer_ip = get_printer_ip()
    if printer_ip is None:
        return jsonify({'error': 'L\'adresse IP de l\'imprimante n\'a pas pu être lue.'})
    # Envoie la mise à jour de progression à 75%
    progress_status[filename] = 75  # Mettre à jour l'état d'avancement
    time.sleep(10)
    print_cmd = ['./cassini.py', '--printer', printer_ip, 'print', filename]
    subprocess.run(print_cmd, capture_output=True, text=True)
    # Envoie la mise à jour de progression à 100%
    progress_status[filename] = 100  # Mettre à jour l'état d'avancement après impression

@app.route('/progress/<filename>')
def get_progress(filename):
    return jsonify({'progress': progress_status.get(filename, 0)})




@app.route('/print-file', methods=['POST'])
def print_file():
    printer_ip = get_printer_ip()
    if printer_ip is None:
        return jsonify({'error': 'L\'adresse IP de l\'imprimante n\'a pas pu être lue.'})

    filename = request.json['filename']
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    upload_cmd = ['./cassini.py', '--printer', printer_ip, 'upload', filepath]
    upload_thread = threading.Thread(target=run_command, args=(upload_cmd, print_file_after_upload, filename))
    upload_thread.start()

    # Ici, nous supposons que la mise à jour de la progression est gérée dans un autre mécanisme
    return jsonify({'message': f'Uploading {filename}, printing will start shortly.'})


@app.route('/delete-file', methods=['POST'])
def delete_file():
    filename = request.json['filename']
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        os.remove(filepath)
        return jsonify({'message': f'File {filename} deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
