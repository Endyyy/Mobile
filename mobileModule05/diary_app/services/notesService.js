import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

const NOTES_COLLECTION = 'notes';

export function subscribeToUserNotes(userEmail, onNotes, onError) {
  const notesQuery = query(collection(db, NOTES_COLLECTION), where('usermail', '==', userEmail));

  return onSnapshot(
    notesQuery,
    (snapshot) => {
      const notes = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      notes.sort((a, b) => {
        const dateA = a.date?.toMillis?.() ?? 0;
        const dateB = b.date?.toMillis?.() ?? 0;
        return dateB - dateA;
      });

      onNotes(notes);
    },
    onError,
  );
}

export async function createNote({ usermail, title, icon, text }) {
  // serverTimestamp = Firebase server time (UTC). Display uses Europe/Paris in the app.
  await addDoc(collection(db, NOTES_COLLECTION), {
    usermail,
    title,
    icon,
    text,
    date: serverTimestamp(),
  });
}

export async function deleteNote(noteId) {
  await deleteDoc(doc(db, NOTES_COLLECTION, noteId));
}
