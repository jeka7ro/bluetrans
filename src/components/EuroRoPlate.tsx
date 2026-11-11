import React from 'react';

interface EuroRoPlateProps {
  plate: string;
  /** sm = rânduri de tabel · lg = carduri */
  size?: 'sm' | 'lg';
}

/** Plăcuță de înmatriculare românească (bandă albastră UE cu „RO” + număr pe fond alb). */
export const EuroRoPlate: React.FC<EuroRoPlateProps> = ({ plate, size = 'lg' }) => {
  const isLg = size === 'lg';
  return (
    <span
      className="inline-flex items-stretch overflow-hidden shrink-0 whitespace-nowrap select-none shadow-sm"
      style={{
        height: isLg ? 36 : 24,
        borderRadius: isLg ? 6 : 4,
        border: '1.5px solid #475569',
        backgroundColor: '#ffffff',
      }}
    >
      <span
        className="flex flex-col items-center justify-center font-extrabold leading-none"
        style={{
          backgroundColor: '#003399',
          color: '#ffffff',
          width: isLg ? 26 : 18,
          fontSize: isLg ? 10 : 7,
        }}
      >
        <span className="euro-ro-plate-star" style={{ color: '#ffcc00', fontSize: isLg ? 9 : 6, lineHeight: 1 }}>
          ★
        </span>
        <span style={{ color: '#ffffff', lineHeight: 1, marginTop: 2 }}>RO</span>
      </span>
      <span
        className="euro-ro-plate-num flex items-center font-black tabular-nums leading-none whitespace-nowrap"
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontSize: isLg ? 20 : 12.5,
          letterSpacing: '0.04em',
          padding: isLg ? '0 10px' : '0 7px',
        }}
      >
        {plate}
      </span>
    </span>
  );
};
