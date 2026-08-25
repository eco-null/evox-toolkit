# evoX Toolkit

evoX **T1 (trusted-node)** yerel geliştirme plugini. Ayrı bir Node process olarak çalışır ve 12 aksiyon sunar.

> ⚠️ **T1 sandbox DEĞİLDİR.** Bu plugin Windows kullanıcı hesabınızın erişebildiği dosya/ağ/uygulamalara erişebilir. Yalnız kaynağını bildiğiniz kodu çalıştırın.

> ℹ️ **Yayın durumu:** Bu proje T1 (yerel geliştirme) hedeflidir. evoX Developer SDK'daki public executable plugin yükleme hattı şu an kapalıdır (`PLUGIN_UPLOAD_NOT_READY`). Bu repo kaynak paylaşımı içindir; evoX **Eklentiler → Geliştirici** penceresiyle kendi makinende çalıştırılır. Detay: evoX SDK "Dağıtım durumu" sayfası.

## Aksiyonlar

| Aksiyon | Açıklama | Controllers |
|---|---|---|
| Sayaç | Tuşa her basışta sayacı artırır, ekranda gösterir | Keypad |
| Hava | wttr.in tabanlı hava durumu ve sıcaklık gösterir | Keypad |
| CPU | CPU sıcaklık + kullanım, büyük alt alta | Keypad |
| GPU | GPU sıcaklık + kullanım, büyük alt alta | Keypad |
| RAM | Kullanılan ve toplam RAM, iki satır (örn. `12.9GB` / `32GB`) | Keypad |
| Disk | Tüm sürücüler döner; harf üstte, boş alan altta (örn. `C:` / `166GB`) | Keypad |
| Disk Seç | Seçilen tek sürücü (ayar: harf, örn. `E`); aynı iki satır düzen | Keypad |
| Hotkey | Sistem kısayolunu (kombinasyon) tetikler; ayara elle yazılır | Keypad |
| Metin Yaz | Metni yazar veya panoya kopyalayıp yapıştırır | Keypad |
| Pano | Panodan kopyalar veya panodaki metni yapıştırır | Keypad |
| URL Aç | HTTP/HTTPS adresi varsayılan tarayıcıda açar | Keypad |

## Kurulum

```bash
npm install
```

Bağımlılıklar: `@evoxapp/plugin-sdk`, `systeminformation`, `sharp`.

## evoX'e yükleme

1. evoX masaüstü uygulamasını açın.
2. **Eklentiler → Geliştirici** butonuna tıklayın.
3. **Proje seç** ile bu klasörü (evox-toolkit) seçin.
4. Risk metnini okuyup **güven** verin ve plugini **başlatın**.
5. **Tuşlar** ekranında aksiyon kitaplığından istediğiniz aksiyonu bir tuşa atayın.

Kod değişikliğinden sonra Geliştirici penceresinden **yeniden yükle** kullanın. Logları aynı pencereden görebilirsiniz.

## Aksiyon bazlı kurulum notları

- **Hava**: Aksiyon ayarlarında **Şehir** alanı zorunludur; tuşta sıcaklık (üstte) ve nem yüzdesi (altta) büyük gösterilir. **Yenileme (dk)** alanıyla güncelleme aralığı seçilir (varsayılan 30 dk); tuş basılınca anında yenilenir.
- **Sistem panelleri (CPU/GPU/RAM/Disk/Disk Seç)**: Aksiyon ayarlarındaki **Güncelleme (sn)** alanıyla panel yenileme aralığını seçebilirsiniz (varsayılan 3 sn). Paneller tuş üzerinde **büyük iki satır görsel** olarak çizilir (v1.2+). CPU sıcaklığı [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor)'dan okunur: LHM'i çalıştırın → **Options → Remote Web Server** açın → CPU aksiyonunun veri adresi alanı `http://localhost:8085/data.json` ile dolu gelir (boşsa otomatik denenir). GPU önce `nvidia-smi`, yoksa si.graphics(), yoksa LHM kullanılır. **Disk Seç** aksiyonunda sürücü harfi ayarı (`C` varsayılan) hangi sürücüyü göstereceğini belirler.
- **Hotkey**: Modifier **dropdown**'ından (Ctrl / Shift / Alt / Win ve komboları) seç, **Tuş** alanına basacağın tuşu yaz (`D`, `F5`, `Tab`); veya **Kısayol elle** alanına tam kombinasyon yaz (`Ctrl+Shift+D`). Host'un kendi kayıt alanından gelen değerler de otomatik denenir. Ayarlar hiç dönmüyorsa log `[hotkey] settings keys: ...` ile görünür.
- **URL Aç**: Adres alanı zorunludur; yalnızca `http`/`https` protokolleri kabul edilir.

## Sorun giderme

| Sorun | Ne yapmalı |
|---|---|
| Plugin başlatılamıyor | Geliştirici penceresinden logları açın; `npm install` yapıldığından emin olun. |
| Aksiyon görünmüyor | Aksiyonun desteklediği controllers (`Keypad`/`Knob`) tuşunuzla uyumlu mu kontrol edin. |
| Handshake timeout | `runtime.mjs` içinde `client.start()` çağrılıyor mu; node_modules kurulu mu kontrol edin. |
