"use client";

export function QrCodeCard({
  petName,
  dataUrl,
  emergencyUrl,
}: {
  petName: string;
  dataUrl: string;
  emergencyUrl: string;
}) {
  function handlePrint() {
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>${petName}'s emergency QR tag</title></head>
        <body style="text-align:center;font-family:sans-serif;padding:24px;">
          <img src="${dataUrl}" style="width:280px;height:280px;" />
          <h2>${petName}</h2>
          <p style="font-size:12px;color:#666;">${emergencyUrl}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="QR code for emergency tag" className="h-40 w-40" />
      <div className="flex gap-2">
        <a href={dataUrl} download={`${petName}-qr-tag.png`} className="btn-secondary btn-sm">
          Download
        </a>
        <button type="button" onClick={handlePrint} className="btn-secondary btn-sm">
          Print
        </button>
      </div>
    </div>
  );
}
