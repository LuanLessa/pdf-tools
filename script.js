let filesMap = new Map();
const dropZone = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const emptyMsg = document.getElementById('empty-msg');

new Sortable(fileList, {
    animation: 150,
    ghostClass: 'bg-light',
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('bg-light', 'border-primary'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('bg-light', 'border-primary'), false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    handleFiles(dt.files);
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', function() { handleFiles(this.files); });

function handleFiles(files) {
    const newFiles = [...files].filter(file => file.type === 'application/pdf');

    if (newFiles.length === 0 && files.length > 0) {
        alert("Apenas arquivos PDF são permitidos.");
        return;
    }

    newFiles.forEach(file => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        
        filesMap.set(id, file);
        
        addFileToList(id, file.name);
    });

    updateUIState();
}

function addFileToList(id, fileName) {
    if (emptyMsg.style.display !== 'none') emptyMsg.style.display = 'none';

    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center grab-cursor';
    li.setAttribute('data-id', id);
    
    li.style.cursor = 'grab';

    li.innerHTML = `
        <div class="d-flex align-items-center">
            <span class="me-2 text-secondary">☰</span> <span>${fileName}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="removeFile('${id}')">✕</button>
    `;
    fileList.appendChild(li);
}

function updateUIState() {
    if (filesMap.size > 0) {
        emptyMsg.style.display = 'none';
        mergeBtn.disabled = false;
        mergeBtn.textContent = `Juntar ${filesMap.size} PDFs e Baixar`;
    } else {
        emptyMsg.style.display = 'block';
        if(fileList.children.length === 0 || (fileList.children.length === 1 && fileList.children[0].id === 'empty-msg')) {
             fileList.innerHTML = '';
             fileList.appendChild(emptyMsg);
        }
        mergeBtn.disabled = true;
        mergeBtn.textContent = "Baixar PDF Unificado";
    }
}

window.removeFile = (id) => {
    filesMap.delete(id);
    
    const itemToRemove = document.querySelector(`li[data-id="${id}"]`);
    if (itemToRemove) {
        itemToRemove.remove();
    }
    
    updateUIState();
};

mergeBtn.addEventListener('click', async () => {
    const originalText = mergeBtn.textContent;
    mergeBtn.textContent = "Processando...";
    mergeBtn.disabled = true;

    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        const listItems = fileList.querySelectorAll('li');
        
        for (const li of listItems) {
            const id = li.getAttribute('data-id');
            const file = filesMap.get(id);

            if (file) {
                const fileBytes = await file.arrayBuffer();
                const pdf = await PDFDocument.load(fileBytes);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
        }

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'pdf_junto_organizado.pdf';
        link.click();

    } catch (err) {
        console.error(err);
        alert("Erro ao processar. Verifique os arquivos.");
    }

    mergeBtn.textContent = originalText;
    mergeBtn.disabled = false;
});