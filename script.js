// HTML elemanlarını seçme
const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement'); // Anlık çekim için
const stripCanvas = document.getElementById('stripCanvas'); // Şerit oluşturmak için
const startButton = document.getElementById('startButton');
const photosDiv = document.getElementById('photos');
const countdownOverlay = document.getElementById('countdown');
const filterOptions = document.querySelectorAll('input[name="filter"]');

const context = canvas.getContext('2d');
const stripContext = stripCanvas.getContext('2d');

let photosTaken = []; // Çekilen 4 fotoğrafı saklamak için dizi
let currentFilter = 'none'; // Aktif filtre

// 1. Kameraya erişim izni isteme
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.play(); // Videoyu oynat
        })
        .catch(err => {
            console.error("Kamera erişiminde hata: " + err);
            alert("Kamera erişimi engellendi veya mevcut değil. Lütfen izin verin.");
        });
}

// Filtre değiştiğinde videoya uygulama
filterOptions.forEach(radio => {
    radio.addEventListener('change', (event) => {
        currentFilter = event.target.value;
        applyFilterToVideo(currentFilter);
    });
});

function applyFilterToVideo(filter) {
    switch (filter) {
        case 'grayscale':
            video.style.filter = 'grayscale(100%)';
            break;
        case 'sepia':
            video.style.filter = 'sepia(100%)';
            break;
        case 'none':
        default:
            video.style.filter = 'none';
            break;
    }
}

// Geri sayım işlevi
function startCountdown(callback) {
    let count = 4;
    countdownOverlay.style.display = 'flex'; // Geri sayımı göster
    countdownOverlay.textContent = count;

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countdownOverlay.textContent = count;
        } else {
            clearInterval(timer);
            countdownOverlay.textContent = 'Çek!';
            setTimeout(() => {
                countdownOverlay.style.display = 'none'; // Geri sayımı gizle
                callback(); // Fotoğraf çekme işlevini çağır
            }, 500); // "Çek!" yazısı biraz kalsın
        }
    }, 1000);
}

// Tek bir fotoğraf çekme işlevi
function takePhoto(filter) {
    // Canvas boyutlarını videonun mevcut boyutlarına ayarlama
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Video karesini canvas'a çizme
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Filtreyi canvas'a uygulama (Pixel manipülasyonu ile daha gerçekçi)
    if (filter !== 'none') {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (filter === 'grayscale') {
                const avg = (r + g + b) / 3;
                data[i] = avg;     // red
                data[i + 1] = avg; // green
                data[i + 2] = avg; // blue
            } else if (filter === 'sepia') {
                const tr = (r * 0.393) + (g * 0.769) + (b * 0.189);
                const tg = (r * 0.349) + (g * 0.686) + (b * 0.168);
                const tb = (r * 0.272) + (g * 0.534) + (b * 0.131);
                data[i] = Math.min(tr, 255);
                data[i + 1] = Math.min(tg, 255);
                data[i + 2] = Math.min(tb, 255);
            }
        }
        context.putImageData(imageData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/png');
    photosTaken.push(dataUrl); // Çekilen fotoğrafı diziye ekle
}

// 4 fotoğrafı sırayla çekme ve şeridi oluşturma
startButton.addEventListener('click', () => {
    startButton.disabled = true; // Başlat butonunu devre dışı bırak
    photosTaken = []; // Yeni çekime başlamadan önce diziyi temizle

    let photoCount = 0;
    const interval = setInterval(() => {
        if (photoCount < 4) {
            startCountdown(() => {
                takePhoto(currentFilter);
                photoCount++;
                if (photoCount === 4) {
                    clearInterval(interval);
                    setTimeout(createPhotoStrip, 1000); // 4 fotoğraf çekildikten sonra şeridi oluştur
                }
            });
        }
    }, 5000); // Her fotoğraf çekimi arasında 4 saniye geri sayım + 1 saniye bekleme
});

// Fotoğraf şeridini oluşturma
function createPhotoStrip() {
    const stripWidth = 200; // Şeridin genişliği (örnek: Image 1'deki gibi)
    const singlePhotoHeight = 150; // Her bir fotoğrafın şeritteki yüksekliği
    const stripHeight = singlePhotoHeight * 4; // Toplam şerit yüksekliği

    stripCanvas.width = stripWidth;
    stripCanvas.height = stripHeight;

    // Şerit arka planını siyah yap
    stripContext.fillStyle = '#000';
    stripContext.fillRect(0, 0, stripWidth, stripHeight);

    let yOffset = 0;
    let loadedImages = 0;

    photosTaken.forEach((photoDataUrl, index) => {
        const img = new Image();
        img.src = photoDataUrl;
        img.onload = () => {
            // Oranı koruyarak fotoğrafı çiz
            const aspectRatio = img.width / img.height;
            const drawWidth = stripWidth;
            const drawHeight = stripWidth / aspectRatio; // Genişliğe göre yüksekliği ayarla

            // Eğer fotoğraf şerit yüksekliğinden daha yüksekse, sığdır
            if (drawHeight > singlePhotoHeight) {
                // singlePhotoHeight'e sığdıracak şekilde yeniden boyutlandır
                const newAspectRatio = img.width / img.height;
                const newHeight = singlePhotoHeight;
                const newWidth = singlePhotoHeight * newAspectRatio;
                stripContext.drawImage(img, (stripWidth - newWidth) / 2, yOffset + (singlePhotoHeight - newHeight) / 2, newWidth, newHeight);
            } else {
                stripContext.drawImage(img, 0, yOffset, drawWidth, drawHeight);
            }
            
            yOffset += singlePhotoHeight;
            loadedImages++;

            if (loadedImages === photosTaken.length) {
                // Tüm resimler yüklendiğinde şeridi galeriye ekle
                displayPhotoStrip(stripCanvas.toDataURL('image/png'));
                startButton.disabled = false; // Başlat butonunu tekrar etkinleştir
            }
        };
    });
}


// Oluşturulan fotoğraf şeridini galeriye ekleme
function displayPhotoStrip(stripDataUrl) {
    const stripContainer = document.createElement('div');
    stripContainer.classList.add('photo-strip-container');

    const stripImg = document.createElement('img');
    stripImg.src = stripDataUrl;
    stripImg.alt = "Vintage Photobooth Şeridi";
    stripImg.style.width = '150px'; // Galerideki şeridin genişliği
    stripImg.style.height = 'auto'; // Oranı koru

    const downloadLink = document.createElement('a');
    downloadLink.href = stripDataUrl;
    downloadLink.download = `vintage_photobooth_${Date.now()}.png`;
    downloadLink.textContent = 'İndir';
    downloadLink.classList.add('download-button');

    stripContainer.appendChild(stripImg);
    stripContainer.appendChild(downloadLink);
    photosDiv.prepend(stripContainer); // En yeni şeridi en başa ekle
}

// Sayfa yüklendiğinde kamerayı başlat
window.onload = startVideo;