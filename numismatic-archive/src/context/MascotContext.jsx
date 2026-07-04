import React, { createContext, useContext, useState } from 'react';
import { imageService } from '../services/imageService.js';

export const MASCOT_LIST = [
  { id: 'MASC-001', country: 'GRECIA', flag: '🇬🇷', imgUrl: imageService.mascot('guardian-grecia.png') },
  { id: 'MASC-002', country: 'CHINA',  flag: '🇨🇳', imgUrl: imageService.mascot('guardian-china.png')  },
  { id: 'MASC-003', country: 'EGIPTO', flag: '🇪🇬', imgUrl: imageService.mascot('guardian-egipto.png') },
  { id: 'MASC-004', country: 'PERÚ',   flag: '🇵🇪', imgUrl: imageService.mascot('guardian-peru.png')   },
  { id: 'MASC-005', country: 'ITALIA', flag: '🇮🇹', imgUrl: imageService.mascot('guardian-italia.png') },
  { id: 'MASC-006', country: 'BRASIL', flag: '🇧🇷', imgUrl: imageService.mascot('guardian-brasil.png') },
];

const MascotContext = createContext(null);

export function MascotProvider({ children }) {
  const [activeMascotId, setActiveMascotId] = useState(
    () => localStorage.getItem('numismatic_mascot') || 'MASC-003'
  );

  const activeMascot = MASCOT_LIST.find(m => m.id === activeMascotId) || MASCOT_LIST[3];

  const setMascot = (id) => {
    setActiveMascotId(id);
    localStorage.setItem('numismatic_mascot', id);
  };

  return (
    <MascotContext.Provider value={{ activeMascot, activeMascotId, setMascot, mascotList: MASCOT_LIST }}>
      {children}
    </MascotContext.Provider>
  );
}

export const useMascot = () => useContext(MascotContext);
