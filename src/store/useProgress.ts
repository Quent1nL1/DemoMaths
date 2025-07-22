import create from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Status = 'mastered' | 'in_progress' | 'not_mastered';

interface ProgressState {
  mastery: Record<string, Status>;
  myDemos: Set<string>;
  setMastery(id: string, s: Status): void;
  toggleMyDemo(id: string): void;
}

const STORAGE_KEY = 'DemoMathsProgress_v2';

export const useProgress = create<ProgressState>((set) => ({
  mastery: {},
  myDemos: new Set(),
  setMastery: (id, s) => set((st) => {
    const mastery = { ...st.mastery, [id]: s };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mastery, myDemos: Array.from(st.myDemos) }));
    return { mastery };
  }),
  toggleMyDemo: (id) => set((st) => {
    const myDemos = new Set(st.myDemos);
    st.myDemos.has(id) ? myDemos.delete(id) : myDemos.add(id);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mastery: st.mastery, myDemos: Array.from(myDemos) }));
    return { myDemos };
  })
}));

AsyncStorage.getItem(STORAGE_KEY).then((str) => {
  if (!str) return;
  try {
    const { mastery, myDemos } = JSON.parse(str);
    useProgress.setState({ mastery, myDemos: new Set(myDemos) });
  } catch {}
});