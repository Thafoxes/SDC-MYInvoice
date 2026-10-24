from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader

out=Path('output/pdf/demo-buyer-purchase-order.pdf')
c=canvas.Canvas(str(out),pagesize=A4)
c.setTitle('Demo buyer purchase order - PO-DEMO-2026-001')
c.setAuthor('NudgeWise demo')
w,h=A4
navy=HexColor('#16324f'); grey=HexColor('#536478'); border=HexColor('#d5dde5')
def txt(x,y,s,size=10,bold=False,color=navy):
    c.setFillColor(color); c.setFont('Helvetica-Bold' if bold else 'Helvetica',size); c.drawString(x,y,s)
def line(y):
    c.setStrokeColor(border); c.line(42,y,w-42,y)
txt(42,797,'PURCHASE ORDER',25,True)
txt(42,774,'PO-DEMO-2026-001',12,True)
c.setFillColor(HexColor('#edf3f8')); c.roundRect(w-188,770,146,37,5,fill=1,stroke=0)
txt(w-175,793,'DEMO DOCUMENT',10,True)
txt(w-175,779,'Fictional companies and contacts',8)
line(754)
txt(42,730,'BUYER / BILL TO',9,True,color=grey)
txt(42,710,'Wong Office Supplies Sdn Bhd',12,True)
for y,s in [(693,'28 Jalan Contoh, Taman Niaga'),(679,'46000 Petaling Jaya, Selangor, Malaysia'),(659,'Contact: Wong Jia Soon'),(645,'Phone: +60 3-0000 0028'),(631,'Email: purchasing@wongoffice.example')]: txt(42,y,s,9)
txt(328,730,'SUPPLIER / SELLER',9,True,color=grey)
txt(328,710,'Kedai Maju Jaya Sdn Bhd',12,True)
for y,s in [(693,'12 Jalan Demo'),(679,'50000 Kuala Lumpur, Malaysia'),(659,'Attention: Demo Salesperson'),(645,'Phone: +60 3-0000 0000'),(631,'Email: sales@kedaimaju.example')]: txt(328,y,s,9)
line(612)
for x,label,value in [(42,'ORDER DATE','24 Oct 2026'),(211,'REQUESTED DELIVERY','31 Oct 2026'),(399,'CURRENCY','MYR')]:
    txt(x,591,label,8,True,color=grey); txt(x,574,value,11,True)
txt(42,544,'REQUESTED ITEMS',10,True)
style=ParagraphStyle('cell',fontName='Helvetica',fontSize=9,leading=13,textColor=navy)
rows=[['No.','Item code / description','Qty','Unit','Unit price\n(MYR)','Line total\n(MYR)'],
['1',Paragraph('<b>PAP-A4-80</b><br/>A4 copy paper 80gsm (500 sheets)',style),'100','ream','12.00','1,200.00'],
['2',Paragraph('<b>PEN-BL-12</b><br/>Blue ballpoint pens (box of 12)',style),'20','box','8.00','160.00'],
['3',Paragraph('<b>FILE-A4</b><br/>A4 lever arch file',style),'20','piece','8.00','160.00']]
t=Table(rows,colWidths=[28,226,35,42,71,109],rowHeights=[36,48,48,48])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('TEXTCOLOR',(0,0),(-1,0),white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),('FONTNAME',(0,1),(-1,-1),'Helvetica'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ALIGN',(2,0),(3,-1),'CENTER'),('ALIGN',(4,0),(-1,-1),'RIGHT'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('GRID',(0,1),(-1,-1),0.5,border),('ROWBACKGROUNDS',(0,1),(-1,-1),[white,HexColor('#f6f8fa')])]))
t.wrapOn(c,511,180); t.drawOn(c,42,350)
for y,label,value in [(329,'Subtotal','1,520.00'),(310,'Discount','0.00'),(291,'Tax','0.00'),(272,'Delivery charge','0.00')]:
    txt(340,y,label,9); c.setFont('Helvetica',10); c.drawRightString(w-50,y,value)
c.setFillColor(navy); c.roundRect(328,225,225,32,4,fill=1,stroke=0)
txt(340,237,'TOTAL (MYR)',11,True,color=white); c.setFont('Helvetica-Bold',13); c.drawRightString(w-50,237,'1,520.00')
txt(42,324,'DELIVER TO',8,True,color=grey)
for y,s in [(307,'Wong Office Supplies Sdn Bhd'),(293,'28 Jalan Contoh, Taman Niaga'),(279,'46000 Petaling Jaya, Selangor, Malaysia')]: txt(42,y,s,9)
line(208)
txt(42,188,'ORDER INSTRUCTIONS',9,True)
for y,s in [(170,'Payment terms: Bank transfer within 7 days of invoice date.'),(155,'Please supply the exact quantities and item codes listed above.'),(140,'Please quote PO-DEMO-2026-001 on the invoice and delivery note.')]: txt(42,y,s,9)
txt(42,108,'Requested by: Wong Jia Soon | Purchasing',9,True)
txt(42,92,'Demo approval: Approved for sample workflow only.',9)
line(72)
txt(42,55,'Reusable demo sample - not a real purchase commitment or payment evidence.',8,color=grey)
txt(w-80,55,'Page 1 / 1',8,color=grey)
c.save()
r=PdfReader(str(out)); text='\n'.join(p.extract_text() for p in r.pages)
assert len(r.pages)==1
for expected in ['PO-DEMO-2026-001','1,520.00','PAP-A4-80','Wong Office Supplies','Kedai Maju Jaya']:
    assert expected in text, expected
assert 100*12+20*8+20*8 == 1520
print(str(out.resolve()))
print('Verified: 1 page, buyer/supplier contacts, 3 items, MYR 1,520.00 total.')
