const express = require('express');
const bwipjs = require('bwip-js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock Database (Asli project mein yahan MongoDB collection hoga)
const productsDB = [
    {
        code: "INV-2026-001",
        name: "Logitech Wireless Mouse M185",
        category: "Electronics",
        price: 699,
        stock: 42,
        type: "code128"
    },
    {
        code: "5901234123457", // 13-digit EAN-13 (with check digit 7)
        name: "Davidoff Rich Aroma Coffee (100g)",
        category: "Groceries",
        price: 550,
        stock: 18,
        type: "ean13"
    },
    {
        code: "PROD-QR-99",
        name: "Sony WH-1000XM5 Headphones",
        category: "Audio",
        price: 26990,
        stock: 7,
        type: "qrcode"
    }
];

// 1. API: Barcode/QR Image Generate Karne Ke Liye (FIXED)
app.post('/api/generate', async (req, res) => {
    const { type, text, name, price, stock, category } = req.body;
    const cleanText = (text || '').trim();

    if (!cleanText) {
        return res.status(400).json({ success: false, message: 'Code empty nahi ho sakta.' });
    }

    try {
        const isQR = type === 'qrcode';

        // Options object banayein (bina height ke)
        const bwipOptions = {
            bcid: type,
            text: cleanText,
            scale: 3,
            includetext: !isQR,
            textxalign: 'center',
            backgroundcolor: 'FFFFFF',
            paddingwidth: isQR ? 4 : 10,
            paddingheight: isQR ? 4 : 10
        };

        // Sirf 1D Barcode (code128, ean13, etc.) ke liye height add karein
        if (!isQR) {
            bwipOptions.height = 14;
        }

        const pngBuffer = await bwipjs.toBuffer(bwipOptions);

        // Agar user ne product details bhi bheji hain, toh DB mein save karein
        if (name && price) {
            const existingIndex = productsDB.findIndex(p => p.code === cleanText);
            const productData = {
                code: cleanText,
                name,
                category: category || 'General',
                price: Number(price),
                stock: Number(stock || 1),
                type
            };

            if (existingIndex > -1) {
                productsDB[existingIndex] = productData;
            } else {
                productsDB.push(productData);
            }
        }

        const base64Image = `data:image/png;base64,${pngBuffer.toString('base64')}`;
        res.json({ success: true, image: base64Image, code: cleanText });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. API: Scan Huye Code Se Product Details Fetch Karne Ke Liye
app.get('/api/product/:code', (req, res) => {
    const scannedCode = req.params.code.trim();

    // Database mein code search karein
    const product = productsDB.find(p => p.code.toLowerCase() === scannedCode.toLowerCase());

    if (!product) {
        return res.status(404).json({
            success: false,
            scannedCode,
            message: `Code "${scannedCode}" ke liye database mein koi product nahi mila.`
        });
    }

    res.json({
        success: true,
        product
    });
});

// Sabhi saved products dekhne ke liye
app.get('/api/products', (req, res) => {
    res.json({ success: true, products: productsDB });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});