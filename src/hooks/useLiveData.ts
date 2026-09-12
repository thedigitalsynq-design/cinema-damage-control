import { useLiveDataContext } from '../context/LiveDataContext';

export function useLiveData(_topic?: string) {
  return useLiveDataContext();
}




