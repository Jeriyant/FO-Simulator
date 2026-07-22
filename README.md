# FO Simulator

Simulasi jaringan fiber optik berbasis web dengan kanvas free-draw (seret, hubungkan, hitung redaman).

## Komponen

| Komponen | Parameter |
|---|---|
| **OLT** | Input redaman / TX power (dBm), jumlah port |
| **Splitter Ratio** | Rasio tidak seimbang + loss % kecil/% besar + merek |
| **Splitter Box** | Pasif PLC 1:2 … 1:64 |
| **Patchcord** | Loss 0.2 dB |
| **Connector** | Loss 0.2 dB |
| **Cable** | Panjang (m/km), loss 0.2 dB/km |
| **ONU / XPON** | RX power & status output |

## Menjalankan via Apache (localhost)

Sudah dikonfigurasi di WSL Apache port 80. Cukup buka:

**http://localhost/**

Setelah mengubah kode, build ulang dan reload Apache:

```bash
wsl -e bash -lc "cd /mnt/e/Cursor-Project/FO-Simulator && ./deploy/setup-apache.sh"
```

Atau manual:

```bash
cd /mnt/e/Cursor-Project/FO-Simulator
npm run build
sudo systemctl reload apache2
```

## Menjalankan dev server (opsional)

```bash
wsl -e bash -lc "cd /mnt/e/Cursor-Project/FO-Simulator && npm run dev"
```

Buka: [http://localhost:5173](http://localhost:5173)

## Cara pakai

1. Seret komponen dari panel kiri ke kanvas
2. Hubungkan port (titik) antar komponen seperti free-draw
3. Pilih komponen untuk edit parameter di panel kanan
4. Lihat hasil RX power & rincian loss di panel bawah
