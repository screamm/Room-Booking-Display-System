import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  // Rensa localStorage mellan tester
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(window, 'addEventListener');
    jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('bör använda standardvärde när inget finns i localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('defaultValue');
  });

  it('bör hämta befintligt värde från localStorage', () => {
    // Förinställd värd i localStorage
    localStorage.setItem('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('storedValue');
  });

  it('bör uppdatera värdet i state och localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(JSON.parse(localStorage.getItem('testKey') || 'null')).toBe('newValue');
  });

  it('bör hantera värden som är objekt', () => {
    const initialObject = { name: 'Test', age: 25 };
    const { result } = renderHook(() => useLocalStorage('testObject', initialObject));

    expect(result.current[0]).toEqual(initialObject);

    const newObject = { name: 'Updated', age: 30 };
    act(() => {
      result.current[1](newObject);
    });

    expect(result.current[0]).toEqual(newObject);
    expect(JSON.parse(localStorage.getItem('testObject') || 'null')).toEqual(newObject);
  });

  it('bör kunna uppdatera värde med en funktionsuppdaterare', () => {
    const initialValue = { count: 0 };
    const { result } = renderHook(() => useLocalStorage('testCounter', initialValue));

    act(() => {
      result.current[1]((prev) => ({ count: prev.count + 1 }));
    });

    expect(result.current[0]).toEqual({ count: 1 });
    expect(JSON.parse(localStorage.getItem('testCounter') || 'null')).toEqual({ count: 1 });
  });

  it('bör lägga till eventlyssnare vid montering och ta bort dem vid avmontering', () => {
    const { unmount } = renderHook(() => useLocalStorage('testKey', 'value'));

    expect(window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('local-storage-updated', expect.any(Function));

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('local-storage-updated', expect.any(Function));
  });

  it('bör hantera JSON-parsningsfel', () => {
    // Simulera felaktig JSON i localStorage
    localStorage.setItem('badJSON', '{invalid:json}');
    
    // Spying på console.error för att undvika utskrift under test
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('badJSON', 'defaultValue'));

    expect(result.current[0]).toBe('defaultValue');
    expect(console.error).toHaveBeenCalled();
  });
}); 