// reference: http://lacpass.create.cl:8089/ValueSet-ddcc-vaccines.html
export const DISEASE_LIST: Map<string, string> = new Map<string, string>();

DISEASE_LIST.set('RA01', 'COVID-19');
DISEASE_LIST.set('1D47', 'Yellow fever');
DISEASE_LIST.set('1F03', 'Measles');
DISEASE_LIST.set('1F03.0', 'Measles without complication');
DISEASE_LIST.set('1F03.1', 'Measles complicated by encephalitis');
DISEASE_LIST.set('1F03.2', 'Measles complicated by meningitis');
DISEASE_LIST.set('1F03.Y', 'Measles with other complications');
DISEASE_LIST.set('1C81', 'Acute poliomyelitis');
DISEASE_LIST.set('XN9S3', 'Yellow fever virus');
DISEASE_LIST.set('XN186', 'Measles virus');
DISEASE_LIST.set('XN3M0', 'Poliovirus');
DISEASE_LIST.set('XN6KZ', 'Wild poliovirus type 1');
DISEASE_LIST.set('XN9CF', 'Wild poliovirus type 2');
DISEASE_LIST.set('XN97R', 'Wild poliovirus type 3');
