/**
 * Parses a raw CSV string into an array of header-mapped objects
 */
export function parseCSVString(csvText: string): Record<string, string>[] {
  if (!csvText || csvText.trim() === '') return [];

  const lines = csvText
    .split(/\r\n|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === '\t') && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) =>
    h
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '')
  );

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] ?? '';
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Download sample CSV template for Student Import
 */
export function getStudentImportTemplateCSV(): string {
  const headers = [
    'admission_number',
    'student_name',
    'date_of_birth',
    'gender',
    'phone',
    'email',
    'address',
    'guardian_name',
    'guardian_phone',
    'class_name',
    'section_name',
  ];

  const sampleRows = [
    [
      'ADM-2026-001',
      'Johnathan Doe',
      '2008-05-14',
      'MALE',
      '+1 (555) 100-2001',
      'john.doe@student.edu',
      '123 Main Street, Cityville',
      'Robert Doe',
      '+1 (555) 900-1001',
      'Grade 11',
      'Section B',
    ],
    [
      'ADM-2026-002',
      'Emma Watson',
      '2008-09-21',
      'FEMALE',
      '+1 (555) 100-2002',
      'emma.watson@student.edu',
      '456 Park Avenue, Metropolis',
      'David Watson',
      '+1 (555) 900-1002',
      'Grade 11',
      'Section B',
    ],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
}

/**
 * Download sample CSV template for Teacher Import
 */
export function getTeacherImportTemplateCSV(): string {
  const headers = ['employee_id', 'full_name', 'email', 'phone', 'qualification', 'joining_date'];

  const sampleRows = [
    ['TCH-2026-001', 'Dr. Richard Feynman', 'rfeynman@school.edu', '+1 (555) 800-1001', 'Ph.D. Quantum Mechanics', '2023-01-15'],
    ['TCH-2026-002', 'Prof. Ada Lovelace', 'alovelace@school.edu', '+1 (555) 800-1002', 'M.Sc. Computer Science', '2023-08-20'],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
}

/**
 * Download sample CSV template for Fee Data Import
 */
export function getFeeImportTemplateCSV(): string {
  const headers = ['admission_number', 'fee_structure_name', 'invoice_number', 'amount', 'discount', 'due_date'];

  const sampleRows = [
    ['ADM-2026-001', 'Annual Physics Lab & Tuition Fee', 'INV-2026-101', '2000.00', '200.00', '2026-11-15'],
    ['ADM-2026-002', 'Annual Physics Lab & Tuition Fee', 'INV-2026-102', '2000.00', '0.00', '2026-11-15'],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
}
