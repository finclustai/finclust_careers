"""Writes a minimal but genuine .docx (a ZIP with the OOXML parts) for e2e tests."""
import os, zipfile

os.makedirs("tools/shots", exist_ok=True)
with zipfile.ZipFile("tools/shots/e2e-cv.docx", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr(
        "[Content_Types].xml",
        '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-'
        'officedocument.wordprocessingml.document.main+xml"/></Types>',
    )
    z.writestr(
        "word/document.xml",
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body><w:p><w:r><w:t>E2E test CV</w:t></w:r></w:p></w:body></w:document>",
    )
print("wrote tools/shots/e2e-cv.docx")
