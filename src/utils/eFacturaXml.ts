/**
 * ANAF RO e-Factura (CIUS-RO UBL 2.1) XML generator & RO e-Transport (UIT) helper.
 * Produces valid UBL 2.1 Invoice XML ready for SPV / ANAF upload or ERP export.
 */

export interface EFacturaInput {
  invoiceNo: string;
  issueDateIso?: string;
  dueDateIso?: string;
  supplierName?: string;
  supplierVat?: string;
  supplierCity?: string;
  customerName: string;
  customerVat?: string;
  tripRef: string;
  route: string;
  trailerId: string;
  uitCode?: string;
  revenueEur: number;
  groupageBonusEur?: number;
}

function escapeXml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildRoEFacturaUblXml(input: EFacturaInput): string {
  const nowDate = (input.issueDateIso || new Date().toISOString()).slice(0, 10);
  const dueDate =
    input.dueDateIso ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const supplierName = input.supplierName || 'BLUE TRANS SPEDITION SRL';
  const supplierVat = input.supplierVat || 'RO31894510';
  const supplierCity = input.supplierCity || 'ORADEA';
  const customerVat = input.customerVat || 'DE298441200';
  const netAmount = Number(input.revenueEur || 0).toFixed(2);
  const noteParts = [
    `Cursa: ${input.tripRef}`,
    `Ruta: ${input.route}`,
    `Semiremorca: ${input.trailerId}`,
  ];
  if (input.uitCode?.trim()) {
    noteParts.push(`Cod RO e-Transport UIT: ${input.uitCode.trim()}`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${escapeXml(input.invoiceNo)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(nowDate)}</cbc:IssueDate>
  <cbc:DueDate>${escapeXml(dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:Note>${escapeXml(noteParts.join(' · '))}</cbc:Note>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:StreetName>Calea Borsului Nr. 45</cbc:StreetName>
        <cbc:CityName>${escapeXml(supplierCity)}</cbc:CityName>
        <cbc:CountrySubentity>RO-BH</cbc:CountrySubentity>
        <cac:Country><cbc:IdentificationCode>RO</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(supplierVat)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(supplierName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:CityName>EU Logistics Hub</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(customerVat)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(input.customerName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">0.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${netAmount}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">0.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>AE</cbc:ID>
        <cbc:Percent>0</cbc:Percent>
        <cbc:TaxExemptionReasonCode>VATEX-EU-AE</cbc:TaxExemptionReasonCode>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${netAmount}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${netAmount}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${netAmount}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${netAmount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${netAmount}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXml(`Transport frigorific international ${input.route} (${input.tripRef})`)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>AE</cbc:ID>
        <cbc:Percent>0</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${netAmount}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>
`;
}

export function downloadRoEFacturaXml(input: EFacturaInput): void {
  const xml = buildRoEFacturaUblXml(input);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eFactura_${input.invoiceNo.replace(/[^A-Za-z0-9_-]/g, '_')}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
