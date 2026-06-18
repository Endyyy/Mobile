import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { deleteNote, subscribeToUserNotes } from '../services/notesService';
import { formatParisDate, getParisDateString } from '../utils/date';

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

function FeelingBadge({ value, size = 14 }) {
  const meta = getFeelingMeta(value);
  const color = FEELING_COLORS[value] ?? '#94a3b8';
  return (
    <View style={[styles.feelingBadge, { backgroundColor: color + '22', borderColor: color }]}>
      <FontAwesome name={meta.icon} size={size} color={color} />
      <Text style={[styles.feelingBadgeText, { color }]}>{meta.label}</Text>
    </View>
  );
}

function todayString() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

export default function AgendaScreen({ authUser }) {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [selectedNote, setSelectedNote] = useState(null);

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

  const markedDates = useMemo(() => {
    const marks = {};
    for (const note of notes) {
      const dateStr = getParisDateString(note.date);
      if (dateStr) {
        marks[dateStr] = { marked: true, dotColor: '#0f172a' };
      }
    }
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] ?? {}),
        selected: true,
        selectedColor: '#0f172a',
        dotColor: '#f8fafc',
      };
    }
    return marks;
  }, [notes, selectedDate]);

  const entriesForDate = useMemo(
    () => notes.filter((n) => getParisDateString(n.date) === selectedDate),
    [notes, selectedDate],
  );

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Calendar
        current={selectedDate}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          selectedDayBackgroundColor: '#0f172a',
          selectedDayTextColor: '#f8fafc',
          todayTextColor: '#3b82f6',
          dayTextColor: '#0f172a',
          textDisabledColor: '#cbd5e1',
          dotColor: '#0f172a',
          selectedDotColor: '#f8fafc',
          arrowColor: '#0f172a',
          monthTextColor: '#0f172a',
          textMonthFontWeight: '700',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
        style={styles.calendar}
      />

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {selectedDate
            ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Select a date'}
        </Text>
        {entriesForDate.length > 0 && (
          <Text style={styles.listHeaderCount}>
            {entriesForDate.length} {entriesForDate.length === 1 ? 'entry' : 'entries'}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.entriesList}
        contentContainerStyle={styles.entriesContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : entriesForDate.length === 0 ? (
          <Text style={styles.emptyText}>No entries for this day</Text>
        ) : (
          entriesForDate.map((item) => (
            <Pressable key={item.id} style={styles.entryCard} onPress={() => setSelectedNote(item)}>
              <View style={styles.entryCardLeft}>
                <View style={styles.entryCardRow}>
                  <FeelingBadge value={item.icon} size={13} />
                  <Text style={styles.entryTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <Text style={styles.entryTime}>{formatParisDate(item.date)}</Text>
              </View>
              <Pressable style={styles.entryDelete} onPress={() => confirmDeleteNote(item)}>
                <FontAwesome name="trash-o" size={17} color="#dc2626" />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={Boolean(selectedNote)} animationType="slide" onRequestClose={() => setSelectedNote(null)}>
        {selectedNote ? (
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedNote.title}</Text>
              <Text style={styles.entryTime}>{formatParisDate(selectedNote.date)}</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'capitalize',
  },
  listHeaderCount: {
    fontSize: 12,
    color: '#64748b',
  },
  entriesList: {
    flex: 1,
  },
  entriesContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  entryTime: {
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
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    paddingHorizontal: 16,
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
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
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
});
