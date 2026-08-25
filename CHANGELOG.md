# Changelog

## v1.1.1 — 2026-08-25

- Spotify credential alanları `secret` → `text` tipine çevrildi (T1 host'te secret tipi desteklenmeyebiliyor; metin alanları her zaman çalışır).
- Token yenileme hatası artık HTTP durum kodu + alan dolu/boş bilgisiyle loglanır (teşhis için).
- sys-cpu `lhmUrl` varsayılanı `http://localhost:8085/data.json` (LibreHardwareMonitor Web Server).

## v1.1.0 — 2026-08-25

- Ekran düzeni (polish): CPU/GPU panellerinde etiketler kaldırıldı; sıcaklık+% büyük alt alta.
- Hava: şehir adı başlıktan çıkarıldı; büyük sıcaklık + nem yüzdesi alt alta (`+28°C\n39%`).
- RAM: kompakt `12.9/32GB` (kullanılan/toplam).
- Disk: kompakt boş alan `C: 166GB`; sürücüler arası otomatik döner.
- GPU: NVIDIA GPU seçimi düzeltildi (nvidia-smi + si.graphics() içinde gerçek GPU arama) — değerler artık görünür.
- CPU: sıcaklık yoksa sadece yüzde; opsiyonel LibreHardwareMonitor (Remote Web Server) entegrasyonu: sys-cpu ayarına `lhmUrl` (örn. `http://localhost:8085/data.json`).
- Hotkey: dropdown kaldırıldı; manuel yazım (`Ctrl+Shift+D`). Eski `preset`/`hotkey` ayarları geriye dönük çalışır.

## v1.0.0 — 2026-08-25

- İlk sürüm: 12 aksiyon (Sayaç, Hava, CPU/GPU/RAM/Disk panelleri, Hotkey, Metin Yaz, Pano, URL Aç, Spotify, Spotify Ses)
- T1 trusted-node; evoX → Eklentiler → Geliştirici ile yerel test
- Notlar: CPU sıcaklığı donanım destekli; yoksa "—" gösterilir. T1 sandbox değildir. Public T2 hedefi sonraki aşama.
