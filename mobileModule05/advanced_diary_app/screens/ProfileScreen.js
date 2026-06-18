import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createNote, deleteNote, subscribeToUserNotes } from '../services/notesService';
import { formatParisDate } from '../utils/date';

const FEELINGS = [
  { value: 'satisfied', label: 'Satisfied', icon: 'smile-o' },
  { value: 'happy', label: 'Happy', icon: 'smile-o' },
  { value: 'neutral', label: 'Neutral', icon: 'meh-o' },
  { value: 'sad', label: 'Sad', icon: 'frown-o' },
  { value: 'angry', label: 'Angry', icon: 'frown-o' },
];

const FEELING_COLORS = {
  satisfied: '#22c55e',
  happy: '#facc15',
  neutral: '#94a3b8',
  sad: '#60a5fa',
  angry: '#f87171',
};

function getFeelingMeta(iconValue) {
  return FEELINGS.find((f) => f.value === iconValue) ?? FEELINGS[2];
}

function FeelingBadge({ value, size = 16 }) {
  const meta = getFeelingMeta(value);
  const color = FEELING_COLORS[value] ?? '#94a3b8';
  return (
    <View style={[styles.feelingBadge, { backgroundColor: color + '22', borderColor: color }]}>
      <FontAwesome name={meta.icon} size={size} color={color} />
      <Text style={[styles.feelingBadgeText, { color }]}>{meta.label}</Text>
    </View>
  );
}

export default function ProfileScreen({ authUser, onLogout }) {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [icon, setIcon] = useState('satisfied');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authUser?.email) return undefined;

    const unsubscribe = subscribeToUserNotes(
      authUser.email,
      (userNotes) => {
        setNotes(userNotes);
        setIsLoading(false);
        setError('');
      },
      (subscribeError) => {
        setError(subscribeError.message || 'Failed to load entries');
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [authUser?.email]);

  const feelingStats = useMemo(
    () =>
      FEELINGS.map((f) => ({
        ...f,
        count: notes.filter((n) => n.icon === f.value).length,
        pct: notes.length ? Math.round((notes.filter((n) => n.icon === f.value).length / notes.length) * 100) : 0,
      })),
    [notes],
  );

  const lastTwo = notes.slice(0, 2);

  const resetCreateForm = () => {
    setTitle('');
    setText('');
    setIcon('satisfied');
  };

  const handleCreateNote = async () => {
    if (!title.trim() || !text.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await createNote({
        usermail: authUser.email,
        title: title.trim(),
        icon,
        text: text.trim(),
      });
      resetCreateForm();
      setIsCreateModalVisible(false);
    } catch (createError) {
      setError(createError.message || 'Failed to create entry');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteNote = (note) => {
    Alert.alert('Delete entry', `Delete "${note.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setError('');
            await deleteNote(note.id);
            if (selectedNote?.id === note.id) {
              setSelectedNote(null);
            }
          } catch (deleteError) {
            setError(deleteError.message || 'Failed to delete entry');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerName} numberOfLines={1}>
              {authUser.displayName || authUser.email}
            </Text>
            <Text style={styles.headerLabel}>My diary</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={onLogout}>
            <FontAwesome name="sign-out" size={15} color="#64748b" />
            <Text style={styles.logoutButtonText}>Log out</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalValue}>{notes.length}</Text>
            <Text style={styles.totalLabel}>{notes.length === 1 ? 'entry' : 'entries'} total</Text>
          </View>
          {notes.length > 0 ? (
            <View style={styles.feelingStatsList}>
              {feelingStats
                .filter((f) => f.count > 0)
                .map((f) => {
                  const color = FEELING_COLORS[f.value] ?? '#94a3b8';
                  return (
                    <View key={f.value} style={styles.feelingStatRow}>
                      <FontAwesome name={f.icon} size={15} color={color} style={styles.feelingStatIcon} />
                      <Text style={styles.feelingStatLabel}>{f.label}</Text>
                      <View style={styles.feelingBarTrack}>
                        <View style={[styles.feelingBarFill, { width: `${f.pct}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={styles.feelingStatPct}>{f.pct}%</Text>
                    </View>
                  );
                })}
            </View>
          ) : (
            !isLoading && <Text style={styles.emptySmall}>No entries yet</Text>
          )}
        </View>

        {/* Last 2 entries */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Recent entries</Text>
          {isLoading ? (
            <Text style={styles.emptySmall}>Loading…</Text>
          ) : lastTwo.length === 0 ? (
            <Text style={styles.emptySmall}>No entries yet</Text>
          ) : (
            lastTwo.map((item) => (
              <Pressable key={item.id} style={styles.entryCard} onPress={() => setSelectedNote(item)}>
                <View style={styles.entryCardLeft}>
                  <View style={styles.entryCardRow}>
                    <FeelingBadge value={item.icon} size={14} />
                    <Text style={styles.entryTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                  <Text style={styles.entryDate}>{formatParisDate(item.date)}</Text>
                </View>
                <Pressable style={styles.entryDelete} onPress={() => confirmDeleteNote(item)}>
                  <FontAwesome name="trash-o" size={17} color="#dc2626" />
                </Pressable>
              </Pressable>
            ))
          )}
        </View>

      </ScrollView>

      {/* New entry button */}
      <View style={styles.fab}>
        <Pressable style={styles.fabButton} onPress={() => setIsCreateModalVisible(true)}>
          <FontAwesome name="plus" size={18} color="#f8fafc" />
          <Text style={styles.fabText}>New entry</Text>
        </Pressable>
      </View>

      {/* Create modal */}
      <Modal visible={isCreateModalVisible} animationType="slide" onRequestClose={() => setIsCreateModalVisible(false)}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>New entry</Text>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Entry title"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Today's mood</Text>
            <View style={styles.feelingsRow}>
              {FEELINGS.map((feeling) => (
                <Pressable
                  key={feeling.value}
                  style={[styles.feelingChip, icon === feeling.value && styles.feelingChipSelected]}
                  onPress={() => setIcon(feeling.value)}
                >
                  <FontAwesome name={feeling.icon} size={16} color="#0f172a" />
                  <Text style={styles.feelingChipText}>{feeling.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={text}
              onChangeText={setText}
              placeholder="Write your diary..."
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  resetCreateForm();
                  setIsCreateModalVisible(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                onPress={handleCreateNote}
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText}>{isSaving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Detail modal */}
      <Modal visible={Boolean(selectedNote)} animationType="slide" onRequestClose={() => setSelectedNote(null)}>
        {selectedNote ? (
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedNote.title}</Text>
              <Text style={styles.entryDate}>{formatParisDate(selectedNote.date)}</Text>
              <FeelingBadge value={selectedNote.icon} size={18} />
              <Text style={styles.readText}>{selectedNote.text}</Text>

              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setSelectedNote(null)}>
                  <Text style={styles.secondaryButtonText}>Close</Text>
                </Pressable>
                <Pressable style={styles.dangerButton} onPress={() => confirmDeleteNote(selectedNote)}>
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 88,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  logoutButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  feelingStatsList: {
    gap: 8,
  },
  feelingStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feelingStatIcon: {
    width: 18,
  },
  feelingStatLabel: {
    width: 68,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  feelingBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  feelingBarFill: {
    height: 8,
    borderRadius: 999,
    minWidth: 4,
  },
  feelingStatPct: {
    width: 36,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  sectionBlock: {
    gap: 10,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  entryCardLeft: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  entryCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  entryDate: {
    fontSize: 12,
    color: '#64748b',
  },
  entryDelete: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    alignSelf: 'stretch',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  feelingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  feelingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 15,
    borderRadius: 14,
  },
  fabText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySmall: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalContent: {
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 140,
  },
  feelingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feelingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feelingChipSelected: {
    borderColor: '#0f172a',
    backgroundColor: '#e2e8f0',
  },
  feelingChipText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  dangerButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  readText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
