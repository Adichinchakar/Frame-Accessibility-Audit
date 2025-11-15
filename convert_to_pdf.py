#!/usr/bin/env python3
"""
Simple Markdown to PDF converter
Creates PDFs from markdown files for Claude Project upload
"""

import os
import sys

def markdown_to_html(md_content):
    """Convert markdown to basic HTML with styling"""
    
    html_template = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-top: 40px;
        }
        h2 {
            color: #34495e;
            border-bottom: 2px solid #95a5a6;
            padding-bottom: 8px;
            margin-top: 30px;
        }
        h3 {
            color: #7f8c8d;
            margin-top: 25px;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            overflow-x: auto;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding-left: 20px;
            color: #555;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #3498db;
            color: white;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        li {
            margin: 8px 0;
        }
        .emoji {
            font-size: 1.2em;
        }
        hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 30px 0;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 2px 4px;
        }
    </style>
</head>
<body>
{content}
</body>
</html>
"""
    
    # Very basic markdown to HTML conversion
    lines = md_content.split('\n')
    html_lines = []
    in_code_block = False
    in_list = False
    code_buffer = []
    
    for line in lines:
        # Code blocks
        if line.strip().startswith('```'):
            if in_code_block:
                html_lines.append('<pre><code>' + '\n'.join(code_buffer) + '</code></pre>')
                code_buffer = []
                in_code_block = False
            else:
                in_code_block = True
            continue
        
        if in_code_block:
            code_buffer.append(line.replace('<', '&lt;').replace('>', '&gt;'))
            continue
        
        # Headers
        if line.startswith('# '):
            html_lines.append(f'<h1>{line[2:]}</h1>')
        elif line.startswith('## '):
            html_lines.append(f'<h2>{line[3:]}</h2>')
        elif line.startswith('### '):
            html_lines.append(f'<h3>{line[4:]}</h3>')
        elif line.startswith('#### '):
            html_lines.append(f'<h4>{line[5:]}</h4>')
        
        # Horizontal rules
        elif line.strip() in ['---', '***', '___']:
            html_lines.append('<hr>')
        
        # Lists
        elif line.strip().startswith('- ') or line.strip().startswith('* '):
            if not in_list:
                html_lines.append('<ul>')
                in_list = True
            html_lines.append(f'<li>{line.strip()[2:]}</li>')
        elif line.strip().startswith(tuple(f'{i}. ' for i in range(10))):
            if not in_list:
                html_lines.append('<ol>')
                in_list = True
            html_lines.append(f'<li>{line.strip().split(". ", 1)[1]}</li>')
        else:
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            
            # Paragraphs
            if line.strip():
                # Basic inline formatting
                line = line.replace('**', '<strong>').replace('**', '</strong>')
                line = line.replace('`', '<code>').replace('`', '</code>')
                html_lines.append(f'<p>{line}</p>')
            else:
                html_lines.append('<br>')
    
    if in_list:
        html_lines.append('</ul>')
    
    return html_template.format(content='\n'.join(html_lines))

def convert_md_to_pdf(md_file_path, output_dir):
    """Convert a markdown file to PDF using wkhtmltopdf"""
    
    filename = os.path.basename(md_file_path)
    name_without_ext = os.path.splitext(filename)[0]
    
    # Read markdown file
    try:
        with open(md_file_path, 'r', encoding='utf-8') as f:
            md_content = f.read()
    except Exception as e:
        print(f"❌ Error reading {filename}: {e}")
        return False
    
    # Convert to HTML
    html_content = markdown_to_html(md_content)
    
    # Save HTML temporarily
    html_file = os.path.join(output_dir, f'{name_without_ext}.html')
    try:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"✅ Created HTML: {html_file}")
    except Exception as e:
        print(f"❌ Error writing HTML for {filename}: {e}")
        return False
    
    # Convert HTML to PDF using wkhtmltopdf
    pdf_file = os.path.join(output_dir, f'{name_without_ext}.pdf')
    
    cmd = f'wkhtmltopdf --enable-local-file-access "{html_file}" "{pdf_file}" 2>/dev/null'
    result = os.system(cmd)
    
    if result == 0:
        print(f"✅ Created PDF: {pdf_file}")
        # Clean up HTML file
        os.remove(html_file)
        return True
    else:
        print(f"❌ Failed to create PDF for {filename}")
        return False

def main():
    base_path = r'C:\Users\Admin\Desktop\Project-Figma-Plugin\Frame-Accessibility-Audit'
    docs_path = os.path.join(base_path, 'docs')
    output_path = os.path.join(base_path, 'pdfs')
    
    # Create output directory
    os.makedirs(output_path, exist_ok=True)
    
    # Files to convert
    files_to_convert = [
        os.path.join(docs_path, 'MASTER_PLAN.md'),
        os.path.join(docs_path, 'CONTEXT_REFERENCE.md'),
        os.path.join(docs_path, 'WEEK1_IMPLEMENTATION.md'),
        os.path.join(docs_path, 'QUICK_START_NEXT_STEPS.md'),
        os.path.join(base_path, 'ARCHITECTURE.md'),
    ]
    
    print("🚀 Starting PDF conversion...")
    print(f"📁 Output directory: {output_path}\n")
    
    success_count = 0
    for md_file in files_to_convert:
        if os.path.exists(md_file):
            if convert_md_to_pdf(md_file, output_path):
                success_count += 1
            print()
        else:
            print(f"⚠️  File not found: {md_file}\n")
    
    print(f"\n✨ Conversion complete! {success_count}/{len(files_to_convert)} files converted")
    print(f"📂 PDFs saved to: {output_path}")

if __name__ == '__main__':
    main()
