const express = require('express');
const bwipjs = require('bwip-js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Validation rules (Zoho Creator article ke standards ke hisaab se)
const validateInput = (type, text) => {
    const cleanText = text.trim();
    if (!cleanText) return 'Data empty nahi ho sakta.';

    switch (type) {
        case 'ean13':
            if (!/^\d{12,13}$/.test(cleanText)) {
                return 'EAN-13 ke liye 12 ya 13 numeric digits (0-9) zaroori hain.';
            }
            break;
        case 'ean8':
            if (!/^\d{7,8}$/.test(cleanText)) {
                return 'EAN-8 ke liye 7 ya 8 numeric digits (0-9) zaroori hain.';
            }
            break;
        case 'upca':
            if (!/^\d{11,12}$/.test(cleanText)) {
                return 'UPC-A ke liye 11 ya 12 numeric digits (0-9) zaroori hain.';
            }
            break;
        case 'code128':
            if (cleanText.length > 48) {
                return 'Code 128 mein maximum 48 characters allowed hain.';
            }
            break;
        case 'qrcode':
            if (cleanText.length > 2953) {
                return 'QR Code mein maximum 2953 characters allowed hain.';
            }
            break;
        default:
            return 'Invalid barcode type select kiya gaya hai.';
    }
    return null;
};

// API Endpoint: Generate QR or Barcode
app.post('/api/generate', async (req, res) => {
    const { type, text } = req.body;

    // 1. Validate Input
    const errorMsg = validateInput(type, text || '');
    if (errorMsg) {
        return res.status(400).json({ success: false, message: errorMsg });
    }

    try {
        const isQR = type === 'qrcode';

        // 2. Configure bwip-js options
        const options = {
            bcid: type,               // Barcode type: qrcode, code128, ean13, ean8, upca
            text: text.trim(),        // Encode hone wala data
            scale: 3,                 // Image resolution scaling
            includetext: !isQR,       // Barcode ke neeche number/text dikhane ke liye (QR mein nahi)
            textxalign: 'center',     // Text ko center align karein
            backgroundcolor: 'FFFFFF' // White background ताकि हर scanner आसानी से पढ़ सके
        };

        // 1D Barcodes ke liye height set karein (millimeters mein)
        if (!isQR) {
            options.height = 14;
            options.paddingwidth = 10;
            options.paddingheight = 10;
        } else {
            options.paddingwidth = 4;
            options.paddingheight = 4;
        }

        // 3. Generate PNG Buffer and convert to Base64
        const pngBuffer = await bwipjs.toBuffer(options);
        const base64Image = `data:image/png;base64,${pngBuffer.toString('base64')}`;

        res.json({
            success: true,
            image: base64Image,
            type,
            encodedText: text.trim()
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Code generate karne mein error: ' + (err.message || err)
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});