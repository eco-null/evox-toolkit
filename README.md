# evoX Toolkit

evoX **T1 (trusted-node)** yerel geliştirme plugini. Ayrı bir Node process olarak çalışır ve 12 aksiyon sunar.

> ⚠️ **T1 sandbox DEĞİLDİR.** Bu plugin Windows kullanıcı hesabınızın erişebildiği dosya/ağ/uygulamalara erişebilir (ör. panoya, hotspot kayıtlarına, Spotify hesabınıza). Yalnız kaynağını bildiğiniz kodu çalıştırın.

## Aksiyonlar

| Aksiyon | Açıklama | Controllers |
|---|---|---|
| Sayaç | Tuşa her basışta sayacı artırır, ekranda gösterir | Keypad |
| Hava | wttr.in tabanlı hava durumu ve sıcaklık gösterir | Keypad |
| CPU | CPU sıcaklık + kullanım, büyük alt alta | Keypad |
| GPU | GPU sıcaklık + kullanım, büyük alt alta | Keypad |
| RAM | Kullanılan/toplam RAM (örn. `12.9/32GB`) | Keypad |
| Disk | Sürücü boş alanı (örn. `C: 166GB`), sürücüler arası döner | Keypad |
| Hotkey | Sistem kısayolunu (kombinasyon) tetikler | Keypad |
| Metin Yaz | Metni yazar veya panoya kopyalayıp yapıştırır | Keypad |
| Pano | Panodan kopyalar veya panodaki metni yapıştırır | Keypad |
| URL Aç | HTTP/HTTPS adresi varsayılan tarayıcıda açar | Keypad |
| Spotify | Spotify çal/durdur, sonraki/önceki, beğen, sessiz | Keypad |
| Spotify Ses | Spotify ses seviyesini Knob ile kontrol eder | Knob, Keypad |

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

- **Hava**: Aksiyon ayarlarında **Şehir** alanı zorunludur; tuşta sıcaklık (üstte) ve nem yüzdesi (altta) büyük gösterilir.
- **Sistem panelleri (CPU/GPU/RAM/Disk)**: Aksiyon ayarlarındaki **Güncelleme (sn)** alanıyla panel yenileme aralığını seçebilirsiniz (varsayılan 3 sn). CPU sıcaklığı donanım destekli değilse yalnız kullanım yüzdesi gösterilir. Sistem sıcaklığını görmek isterseniz [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor) kurup **Options → Remote Web Server**'ı açın ve **CPU** aksiyonunun **veri adresi** alanına `http://localhost:8085/data.json` girin. GPU değerleri NVIDIA denetim için `nvidia-smi` kullanır.
- **Hotkey**: Aksiyon ayarına kısayolu elle yazın — ör. `Ctrl+Shift+D`, `Win+Shift+S`, `Alt+Tab`. Boş bırakırsanız eski sürümlerden kalma `preset`/`hotkey` değerleri ayarlanan kaydı varsa geçerli olur.
- **Spotify / Spotify Ses**: [developer.spotify.com](https://developer.spotify.com) üzerinden uygulama oluşturup Client ID ve Client Secret edinin; Client Credentials + Refresh Token ile kimlik doğrulaması yapılır (ayarlar alanlarına girilir). **Spotify Ses** aksiyonunu bir Knob'a atayarak ses seviyesini kontrol edebilirsiniz.
- **URL Aç**: Adres alanı zorunludur; yalnızca `http`/`https` protokolleri kabul edilir.

## Sorun giderme

| Sorun | Ne yapmalı |
|---|---|
| Plugin başlatılamıyor | Geliştirici penceresinden logları açın; `npm install` yapıldığından emin olun. |
| Aksiyon görünmüyor | Aksiyonun desteklediği controllers (`Keypad`/`Knob`) tuşunuzla uyumlu mu kontrol edin. |
| Handshake timeout | `runtime.mjs` içinde `client.start()` çağrılıyor mu; node_modules kurulu mu kontrol edin. |
