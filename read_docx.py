import docx
import sys

def read_docx_tables(filename):
    doc = docx.Document(filename)
    for i, table in enumerate(doc.tables):
        print(f"--- Table {i} ---")
        for row in table.rows:
            row_data = []
            for cell in row.cells:
                text = cell.text.replace('\n', ' ').strip()
                if text not in row_data:  # docx merges cells sometimes making them repeat in .cells
                    row_data.append(text)
            print(" | ".join(row_data))

if __name__ == '__main__':
    read_docx_tables(sys.argv[1])
