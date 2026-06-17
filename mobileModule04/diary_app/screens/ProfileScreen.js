import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
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
  { value: 'satisfied', label: 'Satisfait', icon: 'smile-o' },
  { value: 'happy', label: 'Heureux', icon: 'grin' },
  { value: 'neutral', label: 'Neutre', icon: 'meh-o' },
  { value: 'sad', label: 'Triste', icon: 'frown-o' },
  { value: 'angry', label: 'En colere', icon: 'angry' },
];

function getFeelingMeta(iconValue) {
  return FEELINGS.find((feeling) => feeling.value === iconValue) ?? FEELINGS[2];
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
        setError(subscribeError.message || 'Impossible de charger les entrees');
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [authUser?.email]);

  const resetCreateForm = () => {
    setTitle('');
    setText('');
    setIcon('satisfied');
  };

  const handleCreateNote = async () => {
    if (!title.trim() || !text.trim()) {
      setError('Le titre et le contenu sont obligatoires');
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
      setError(createError.message || 'Impossible de creer l entree');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteNote = (note) => {
    Alert.alert('Supprimer l entree', `Supprimer "${note.title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            setError('');
            await deleteNote(note.id);
            if (selectedNote?.id === note.id) {
              setSelectedNote(null);
            }
          } catch (deleteError) {
            setError(deleteError.message || 'Impossible de supprimer l entree');
          }
        },
      },
    ]);
  };

  const renderNoteItem = ({ item }) => {
    const feeling = getFeelingMeta(item.icon);

    return (
      <View style={styles.noteCard}>
        <Pressable style={styles.noteCardContent} onPress={() => setSelectedNote(item)}>
          <View style={styles.noteCardHeader}>
            <FontAwesome name={feeling.icon} size={18} color="#0f172a" />
            <Text style={styles.noteTitle}>{item.title}</Text>
          </View>
          <Text style={styles.noteDate}>{formatParisDate(item.date)}</Text>
          <Text style={styles.notePreview} numberOfLines={2}>
            {item.text}
          </Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={() => confirmDeleteNote(item)}>
          <FontAwesome name="trash-o" size={18} color="#dc2626" />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mon journal</Text>
          <Text style={styles.headerSubtitle}>
            {authUser.displayName || authUser.email}
          </Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Deconnexion</Text>
        </Pressable>
      </View>

      <Pressable style={styles.createButton} onPress={() => setIsCreateModalVisible(true)}>
        <FontAwesome name="plus" size={16} color="#f8fafc" />
        <Text style={styles.createButtonText}>Nouvelle entree</Text>
      </Pressable>

      {isLoading ? <Text style={styles.infoText}>Chargement des entrees...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderNoteItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.infoText}>Aucune entree pour le moment.</Text> : null
        }
      />

      <Modal visible={isCreateModalVisible} animationType="slide" onRequestClose={() => setIsCreateModalVisible(false)}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle entree</Text>

            <Text style={styles.fieldLabel}>Titre</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de l entree"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Humeur du jour</Text>
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

            <Text style={styles.fieldLabel}>Contenu</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={text}
              onChangeText={setText}
              placeholder="Ecris ton journal..."
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
                <Text style={styles.secondaryButtonText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                onPress={handleCreateNote}
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText}>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedNote)} animationType="slide" onRequestClose={() => setSelectedNote(null)}>
        {selectedNote ? (
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedNote.title}</Text>
              <Text style={styles.noteDate}>{formatParisDate(selectedNote.date)}</Text>
              <View style={styles.readFeelingRow}>
                <FontAwesome name={getFeelingMeta(selectedNote.icon).icon} size={20} color="#0f172a" />
                <Text style={styles.readFeelingText}>{getFeelingMeta(selectedNote.icon).label}</Text>
              </View>
              <Text style={styles.readText}>{selectedNote.text}</Text>

              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setSelectedNote(null)}>
                  <Text style={styles.secondaryButtonText}>Fermer</Text>
                </Pressable>
                <Pressable style={styles.dangerButton} onPress={() => confirmDeleteNote(selectedNote)}>
                  <Text style={styles.dangerButtonText}>Supprimer</Text>
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  logoutButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  createButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  noteCardContent: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  noteDate: {
    fontSize: 13,
    color: '#64748b',
  },
  notePreview: {
    fontSize: 14,
    color: '#334155',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
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
  readFeelingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readFeelingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  readText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
