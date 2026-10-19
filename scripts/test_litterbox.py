import urllib.request

png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82'
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

parts = [
    b'--' + boundary.encode() + b'\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n',
    b'--' + boundary.encode() + b'\r\nContent-Disposition: form-data; name="time"\r\n\r\n72h\r\n',
    b'--' + boundary.encode() + b'\r\nContent-Disposition: form-data; name="fileToUpload"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n',
    png_bytes,
    b'\r\n--' + boundary.encode() + b'--\r\n'
]
body = b''.join(parts)

req = urllib.request.Request(
    'https://litterbox.catbox.moe/resources/internals/api.php',
    data=body,
    headers={'Content-Type': 'multipart/form-data; boundary=' + boundary, 'User-Agent': 'Mozilla/5.0'}
)
resp = urllib.request.urlopen(req, timeout=10)
print('Response URL:', resp.read().decode('utf-8'))
