import gdown
import os

url = 'https://drive.google.com/drive/folders/1S9h3QslTu0Wj3mfjWWAInO_JyoxauCR0'

output_dir = 'bac_pdfs'
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

print("Starting download of the public Google Drive folder...")
gdown.download_folder(url, output=output_dir, quiet=False, use_cookies=False)
print("Download finished!")
