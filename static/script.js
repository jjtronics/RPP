// script.js - Code complet pour la gestion du statut de l'imprimante, l'affichage et la suppression des fichiers

let selectedFile = null;

document.addEventListener('DOMContentLoaded', (event) => {
    fetchPrintStatus();
    fetchFiles();
    loadPrinterIP();
});

function loadPrinterIP() {
    fetch('/get-printer-ip')
        .then(response => response.json())
        .then(data => {
            if (data.ip) {
                document.getElementById('printer-ip').value = data.ip;
            } else {
                console.error('Error loading IP:', data.error);
            }
        });
}

setInterval(loadPrinterIP, 5000); // Mettre    jour le statut toutes les 5 secondes


function saveIP() {
    let ipField = document.getElementById('printer-ip');
    let saveBtn = document.querySelector('.save-ip-btn'); // Sélection du bouton Save
    let newIP = ipField.value;

    fetch('/set-printer-ip', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ip: newIP }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert('Printer IP updated!');
            ipField.readOnly = true; // Rendre le champ IP en lecture seule à nouveau
            saveBtn.style.display = 'none'; // Cacher le bouton Save
        } else {
            console.error('Error saving IP:', data.error);
        }
    });
}

function editIP() {
    let ipField = document.getElementById('printer-ip');
    let saveBtn = document.querySelector('.save-ip-btn'); // Sélection du bouton Save

    ipField.readOnly = false;
    ipField.focus();
    ipField.select();

    saveBtn.style.display = 'inline-block'; // Afficher le bouton Save
}



// script.js - Code complet pour la gestion du statut de l'imprimante, l'affichage, l'upload et la suppression des fichiers

// ... les fonctions existantes ...

function uploadFile() {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
        let file = e.target.files[0];
        let formData = new FormData();
        formData.append('file', file);

        showLoadingIndicator('Uploading...');

        let xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                let percentComplete = (e.loaded / e.total) * 100;
                updateLoadingPercentage(percentComplete);
            }
        };

        xhr.onloadstart = function(e) {
            updateLoadingPercentage(0); // Initialisation de la barre de progression à 0%
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                updateLoadingPercentage(100); // Terminé, fixez la barre de progression à 100%
                hideLoadingIndicator();
                alert('Upload complete!');
                fetchFiles(); // Mettre à jour la liste après l'upload
            } else {
                alert('An error occurred during the upload.');
            }
        };

        xhr.onerror = function() {
            hideLoadingIndicator();
            alert('An error occurred during the upload.');
        };

        xhr.send(formData);
    };
    input.click(); // Ouvrir le dialogue de sélection de fichier
}


function printSelectedFile() {
    if (selectedFile) {
        showLoadingIndicator('Preparing print...');
        checkProgress(selectedFile); // Commencer à vérifier l'état d'avancement

        fetch('/print-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: selectedFile }),
        })
        .then(response => response.json())
        .then(data => {
            updatePrintProgress(50); // Mise à jour à 50% après la fin de printSelectedFile
            alert(data.message); // Affichez un message à l'utilisateur
        })
        .catch(error => {
            hideLoadingIndicator();
            console.error('Error:', error);
        });
    }
}

function updatePrintProgress(percent) {
    showLoadingIndicator(`Printing... (${percent}%)`);
    updateLoadingPercentage(percent);


    if (percent >= 100) {
        setTimeout(hideLoadingIndicator, 1000); // Masquer la roue crantée après un bref délai pour permettre à l'utilisateur de voir que l'impression est terminée
    }
}




// Fonction pour afficher l'indicateur de chargement avec message et pourcentage
function showLoadingIndicator(message) {
    // Créez et affichez ici une roue crantée et le message de pourcentage
    // Vous pouvez utiliser une div avec un spinner CSS ou une image de roue crantée
    let loadingDiv = document.getElementById('loading-indicator');
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
            <p id="loading-percentage">0%</p>`;
        document.body.appendChild(loadingDiv);
    }
}

// Fonction pour masquer l'indicateur de chargement
function hideLoadingIndicator() {
    let loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}





function updateLoadingPercentage(percent) {
    // Mettre à jour l'interface utilisateur avec la progression de l'upload
    let percentageText = document.getElementById('loading-percentage');
    if (percentageText) {
        percentageText.innerText = `${percent.toFixed(2)}%`;
    }
    // Si vous avez une barre de progression, mettez également à jour sa largeur ici
}


// ... le reste de votre script ...

function checkProgress(filename) {
    fetch(`/progress/${filename}`)
        .then(response => response.json())
        .then(data => {
            updatePrintProgress(data.progress);
            if (data.progress < 100) {
                setTimeout(() => checkProgress(filename), 1000); // Interroger toutes les secondes
            }
        })
        .catch(error => console.error('Error:', error));
}


//



function fetchPrintStatus() {
    fetch('/print-status')
        .then(response => response.json())
        .then(data => {
            document.getElementById('status').innerText = data.status;
            let progressBar = document.getElementById('progress-bar');
            let progressText = document.getElementById('progress-text');
            let progressValue = parseFloat(data.progress).toFixed(2);
            progressBar.style.width = progressValue + '%';
            progressText.innerText = progressValue + '%';
            // Mettre    jour la capsule ONLINE/OFFLINE
            const onlineStatusElement = document.getElementById('online-status');
            if (data.is_online) {
                onlineStatusElement.classList.remove('offline');
                onlineStatusElement.classList.add('online');
                onlineStatusElement.textContent = 'ONLINE';
            } else {
                onlineStatusElement.classList.remove('online');
                onlineStatusElement.classList.add('offline');
                onlineStatusElement.textContent = 'OFFLINE';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('status').innerText = 'Erreur de chargement du statut.';
        });
}

function fetchFiles() {
    fetch('/files')
        .then(response => response.json())
        .then(filesInfo => {
            let tableRows = filesInfo.map(fileInfo =>
                `<tr onclick="selectFile('${fileInfo.name}')">
                    <td>${fileInfo.name}</td>
                    <td>${fileInfo.size} Mo</td>
                </tr>`
            ).join('');
            document.getElementById('file-list').querySelector('tbody').innerHTML = tableRows;
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('file-list').querySelector('tbody').innerHTML = '<tr><td colspan="2">Erreur de chargement des fichiers.</td></tr>';
        });
}

function selectFile(filename) {
    selectedFile = filename;
    document.querySelectorAll('.file-list tr').forEach(tr => {
        tr.classList.remove('selected');
    });
    const selectedRow = [...document.querySelectorAll('.file-list tr')].find(tr => tr.cells[0].textContent === filename);
    if (selectedRow) {
        selectedRow.classList.add('selected');
    }
}


function deleteSelectedFile() {
    if (selectedFile) {
        fetch('/delete-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: selectedFile }),
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message); // Affichez un message à l'utilisateur
            fetchFiles(); // Mettre à jour la liste après la suppression
        })
        .catch(error => console.error('Error:', error));
    }
}

setInterval(fetchPrintStatus, 5000); // Mettre à jour le statut toutes les 5 secondes
