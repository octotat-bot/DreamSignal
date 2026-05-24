import React, { useState } from 'react';
import { useFirstVisit } from '../hooks/useFirstVisit';
import DarkroomLoader from './DarkroomLoader';
import DarkroomWalkthrough from './DarkroomWalkthrough';

const FirstTimeExperience = () => {
  const { isFirstVisit, clearFirstVisit } = useFirstVisit();
  const [phase, setPhase] = useState('loader'); 
  // phases: 'loader' | 'walkthrough' | 'done'

  if (!isFirstVisit) return null; // returning visitor — show nothing

  if (phase === 'loader') return (
    <DarkroomLoader onComplete={() => setPhase('walkthrough')} />
  );

  if (phase === 'walkthrough') return (
    <DarkroomWalkthrough onComplete={() => {
      clearFirstVisit();  // remove localStorage key HERE
      setPhase('done');
    }} />
  );

  return null; // phase === 'done'
};

export default FirstTimeExperience;
