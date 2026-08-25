# Changelog

## v1.2.0 — 2026-08-25

- Paneller ve hava durumu artık **görsel render**: sharp ile 128×128 PNG — iki satır büyük okunur (CPU/GPU: sıcaklık üstte açık mavi + kullanım altta; RAM: `12.9/32GB`; Disk: `C: 166GB`; Hava: `+28°C`/`39%`). sharp başarısız olursa metin fallback.
- **LibreHardwareMonitor tam destek:** ağaç JSON parse (SensorId/Type/Value, virgül ondalık). CPU sıcaklık zinciri: si → WMI → LHM (AMD: Tctl/Tdie). GPU zinciri: nvidia-smi → si.graphics → LHM (gpu-nvidia). Veri adresi boşsa otomatik `http://localhost:8085/data.json`.
- **Spotify:** `getSettings(binding)` boşsa plugin-geneli settings fallback; hatada hangi ayar anahtarlarının geldiği loglanır (değerler değil); **accessToken yedek alanı** (taze access token yapıştır → 1 saat kesintisiz).

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
