import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe,
  FieldValue,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageAt: any;
  unreadCount?: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

/** Deterministic conversation ID for two users. */
export function getConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

/** Creates the conversation document if it doesn't already exist. */
export async function ensureConversation(
  myUid: string,
  myName: string,
  otherUid: string,
  otherName: string
): Promise<string> {
  const convId = getConversationId(myUid, otherUid);
  const convRef = doc(db, 'conversations', convId);
  await setDoc(
    convRef,
    {
      participants: [myUid, otherUid],
      participantNames: { [myUid]: myName, [otherUid]: otherName },
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
    },
    { merge: true }
  );
  return convId;
}

/** Sends a message in a conversation. */
export async function sendChatMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<void> {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  await addDoc(messagesRef, {
    senderId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
  // Update conversation summary
  await setDoc(
    doc(db, 'conversations', conversationId),
    { lastMessage: text.trim().slice(0, 200), lastMessageAt: serverTimestamp() },
    { merge: true }
  );
}

/** Subscribe to my conversations (ordered by lastMessageAt desc). */
export function listenToConversations(
  myUid: string,
  callback: (convs: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', myUid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  });
}

/** Subscribe to messages in a conversation. */
export function listenToMessages(
  conversationId: string,
  callback: (msgs: ChatMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  });
}
