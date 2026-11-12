from pathlib import Path
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT

src = Path(__file__).with_name('PROJECT_REQUIREMENTS.md')
out = src.with_name('PROJECT_REQUIREMENTS.docx')
lines = src.read_text(encoding='utf-8').splitlines()
doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(.72); sec.bottom_margin = Inches(.68)
sec.left_margin = Inches(.78); sec.right_margin = Inches(.78)
styles = doc.styles
styles['Normal'].font.name = 'Aptos'; styles['Normal'].font.size = Pt(9.5)
styles['Normal'].font.color.rgb = RGBColor(48, 56, 66)
styles['Normal'].paragraph_format.space_after = Pt(5)
for sty, size, color in [('Title', 25, '17365D'), ('Heading 1', 16, '17365D'), ('Heading 2', 12, '1F5A85')]:
    s=styles[sty]; s.font.name='Aptos Display'; s.font.size=Pt(size); s.font.bold=True; s.font.color.rgb=RGBColor.from_string(color)
    s.paragraph_format.keep_with_next=True
styles['Heading 1'].paragraph_format.space_before=Pt(14); styles['Heading 1'].paragraph_format.space_after=Pt(6)
styles['Heading 2'].paragraph_format.space_before=Pt(9); styles['Heading 2'].paragraph_format.space_after=Pt(4)

def clean(s):
    s=s.strip()
    s=re.sub(r'\*\*(.*?)\*\*',r'\1',s)
    s=re.sub(r'`(.*?)`',r'\1',s)
    return s

def add_table(rows):
    parsed=[[clean(x) for x in row.strip().strip('|').split('|')] for row in rows]
    if len(parsed)>1 and all(re.fullmatch(r'\s*:?-{3,}:?\s*', c or '---') for c in parsed[1]): parsed.pop(1)
    if not parsed: return
    t=doc.add_table(rows=1, cols=len(parsed[0])); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.style='Light Shading Accent 1'
    for j,val in enumerate(parsed[0]):
        cell=t.rows[0].cells[j]; cell.text=val; cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        for run in cell.paragraphs[0].runs: run.bold=True; run.font.color.rgb=RGBColor(255,255,255); run.font.size=Pt(8.5)
    for row in parsed[1:]:
        cells=t.add_row().cells
        for j,val in enumerate(row):
            if j<len(cells):
                cells[j].text=val; cells[j].vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
                for p in cells[j].paragraphs:
                    p.paragraph_format.space_after=Pt(2)
                    for r in p.runs: r.font.size=Pt(8.5)
    doc.add_paragraph().paragraph_format.space_after=Pt(1)

i=0; title_seen=False
while i<len(lines):
    line=lines[i].strip()
    if not line or line=='---': i+=1; continue
    if line.startswith('|'):
        group=[]
        while i<len(lines) and lines[i].strip().startswith('|'):
            group.append(lines[i].strip()); i+=1
        add_table(group); continue
    if line.startswith('# '):
        p=doc.add_paragraph(style='Title' if not title_seen else 'Heading 1'); p.add_run(clean(line[2:])); title_seen=True; i+=1; continue
    if line.startswith('## '): doc.add_heading(clean(line[3:]), level=1); i+=1; continue
    if line.startswith('### '): doc.add_heading(clean(line[4:]), level=2); i+=1; continue
    if re.match(r'^\d+\.\s+',line):
        p=doc.add_paragraph(style='List Number'); p.add_run(clean(re.sub(r'^\d+\.\s+','',line))); i+=1; continue
    if line.startswith('- '):
        p=doc.add_paragraph(style='List Bullet'); p.add_run(clean(line[2:])); i+=1; continue
    p=doc.add_paragraph(clean(line))
    if line.startswith('**Document type:**'):
        p.paragraph_format.space_after=Pt(2)
        for r in p.runs: r.font.size=Pt(9); r.font.color.rgb=RGBColor(90,100,112)
    i+=1

footer=sec.footer.paragraphs[0]
footer.alignment=WD_ALIGN_PARAGRAPH.RIGHT
r=footer.add_run('Chit Fund Management System  |  Project Requirements')
r.font.name='Aptos'; r.font.size=Pt(8); r.font.color.rgb=RGBColor(115,125,135)
doc.core_properties.title='Chit Fund Management System Project Requirements Document'
doc.core_properties.subject='As-built product requirements, roles, workflows, and technology stack'
doc.save(out)
print(out)
