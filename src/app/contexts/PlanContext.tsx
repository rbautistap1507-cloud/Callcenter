import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlanType } from '../config/planConfig';

interface PlanContextType {
  currentPlan: PlanType;
  setPlan: (plan: PlanType) => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

interface PlanProviderProps {
  children: ReactNode;
  initialPlan?: PlanType;
}

export function PlanProvider({ children, initialPlan = 'enterprise' }: PlanProviderProps) {
  const [currentPlan, setCurrentPlan] = useState<PlanType>(() => {
    // Intentar obtener el plan del localStorage primero (solo en cliente)
    if (typeof window !== 'undefined') {
      try {
        const storedPlan = localStorage.getItem('lympos-plan');
        if (storedPlan && ['starter', 'pro', 'enterprise'].includes(storedPlan)) {
          return storedPlan as PlanType;
        }
      } catch (error) {
        console.error('Error reading from localStorage:', error);
      }
    }
    return initialPlan;
  });

  useEffect(() => {
    // Guardar el plan en localStorage cuando cambie (solo en cliente)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lympos-plan', currentPlan);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    }
  }, [currentPlan]);

  const setPlan = (plan: PlanType) => {
    setCurrentPlan(plan);
  };

  return (
    <PlanContext.Provider value={{ currentPlan, setPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlanContext(): PlanContextType {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlanContext must be used within a PlanProvider');
  }
  return context;
}
