const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

async function createPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  page.drawText('Jane Doe\nSoftware Engineer with 5 years of experience in React and Node.js.\nSkills: JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, Prisma.', {
    x: 50,
    y: 700,
    size: 15,
  });
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('C:\\Catalyst Soul AI\\dummy_resume.pdf', pdfBytes);
  console.log('PDF generated successfully');
}

createPdf().catch(console.error);
