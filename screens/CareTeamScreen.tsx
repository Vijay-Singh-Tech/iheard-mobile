import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';

import type { CareRecipient } from '../App';
import TodayIcon from '../components/TodayIcon';
import { supabase } from '../services/supabase';
import { recipientTitle } from './CareRecipientsEditor';

const categories = [
  'Primary Care Doctor',
  'Specialist',
  'Mental Health Professional',
  'Pharmacy',
  'Other Care Provider',
] as const;

type Contact = {
  id: string;
  category: (typeof categories)[number];
  provider_name: string | null;
  role_specialty: string;
  phone_number: string | null;
  organization_name: string;
  address: string | null;
  email: string | null;
  notes: string | null;
};

const contactColumns = 'id, category, provider_name, role_specialty, phone_number, organization_name, address, email, notes';

type TeamProps = {
  caregiverId: string;
  onPageChange: () => void;
};

export default function CareTeamScreen({ caregiverId, onPageChange }: TeamProps) {
  const [recipients, setRecipients] = useState<CareRecipient[]>();
  const [recipient, setRecipient] = useState<CareRecipient>();
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecipients() {
      try {
        const { data, error } = await supabase.from('care_recipients')
          .select('id, preferred_name, relationship, primary_condition')
          .eq('caregiver_id', caregiverId)
          .order('created_at', { ascending: true }).order('id', { ascending: true })
          .abortSignal(controller.signal);
        if (error) throw error;
        if (!controller.signal.aborted) setRecipients(data);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }

    void loadRecipients();
    return () => controller.abort();
  }, [caregiverId, retry]);

  if (recipient) {
    return (
      <RecipientTeam
        caregiverId={caregiverId}
        recipient={recipient}
        onPageChange={onPageChange}
        onBack={() => {
          onPageChange();
          setRecipient(undefined);
        }}
      />
    );
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>Care Team</Text>
      <Text style={styles.subtitle}>Choose a care recipient to manage their contacts.</Text>
      {!recipients && (
        <LoadState label="care recipients" failed={loadError} onRetry={() => {
          setLoadError(false);
          setRetry((value) => value + 1);
        }} />
      )}
      {recipients?.length === 0 && (
        <Text style={styles.subtitle}>Add a recipient in Profile → Care Recipients to get started.</Text>
      )}
      {recipients?.map((item) => {
        const title = recipientTitle(item);
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Select ${title}`}
            onPress={() => {
              onPageChange();
              setRecipient(item);
            }}
            style={({ pressed }) => [styles.recipientRow, pressed && styles.pressed]}
          >
            <TodayIcon name="profile" size={26} />
            <Text style={styles.recipientName}>{title}</Text>
            <View style={styles.chevron}><TodayIcon name="chevron" size={17} /></View>
          </Pressable>
        );
      })}
    </>
  );
}

function RecipientTeam({ caregiverId, recipient, onPageChange, onBack }: TeamProps & {
  recipient: CareRecipient;
  onBack: () => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>();
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [editor, setEditor] = useState<Contact | 'new'>();
  const [deletingId, setDeletingId] = useState<string>();
  const [deleteError, setDeleteError] = useState(false);
  const deleting = useRef(false);
  const recipientId = recipient.id;

  useEffect(() => {
    const controller = new AbortController();

    async function loadContacts() {
      try {
        const { data, error } = await supabase.from('care_team_contacts')
          .select(contactColumns)
          .eq('caregiver_id', caregiverId)
          .eq('care_recipient_id', recipientId)
          .order('created_at', { ascending: true }).order('id', { ascending: true })
          .abortSignal(controller.signal);
        if (error) throw error;
        if (!controller.signal.aborted) setContacts(data);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }

    void loadContacts();
    return () => controller.abort();
  }, [caregiverId, recipientId, retry]);

  function closeEditor() {
    Keyboard.dismiss();
    onPageChange();
    setEditor(undefined);
  }

  async function deleteContact(contact: Contact) {
    if (deleting.current) return;
    deleting.current = true;
    setDeleteError(false);
    setDeletingId(contact.id);
    try {
      const { error } = await supabase.from('care_team_contacts').delete()
        .eq('id', contact.id)
        .eq('caregiver_id', caregiverId)
        .eq('care_recipient_id', recipientId);
      if (error) throw error;
      setContacts((current) => current?.filter(({ id }) => id !== contact.id));
    } catch {
      setDeleteError(true);
    } finally {
      deleting.current = false;
      setDeletingId(undefined);
    }
  }

  function confirmDelete(contact: Contact) {
    Alert.alert(
      `Delete ${contactName(contact)}?`,
      'This permanently removes the contact from this recipient’s Care Team.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteContact(contact) },
      ],
      { cancelable: true },
    );
  }

  if (editor) {
    return (
      <ContactForm
        caregiverId={caregiverId}
        recipientId={recipientId}
        recipientLabel={recipientTitle(recipient)}
        contact={editor === 'new' ? undefined : editor}
        onCancel={closeEditor}
        onSaved={(saved) => {
          setContacts((current) => editor === 'new'
            ? [...(current ?? []), saved]
            : current?.map((item) => item.id === saved.id ? saved : item));
          closeEditor();
        }}
      />
    );
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>Care Team</Text>
      <Text style={styles.subtitle}>{recipientTitle(recipient)}</Text>
      <Pressable accessibilityRole="button" onPress={onBack} disabled={Boolean(deletingId)} style={styles.inline}>
        <Text style={styles.link}>‹ Choose another recipient</Text>
      </Pressable>
      {!contacts ? (
        <LoadState label="contacts" failed={loadError} onRetry={() => {
          setLoadError(false);
          setRetry((value) => value + 1);
        }} />
      ) : (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Add contact" disabled={Boolean(deletingId)}
            onPress={() => {
              onPageChange();
              setEditor('new');
            }}
            style={[styles.primary, deletingId && styles.pressed]}>
            <Text style={styles.primaryLabel}>＋ Add contact</Text>
          </Pressable>
          {contacts.length === 0 && <Text style={styles.subtitle}>No contacts saved for this recipient yet.</Text>}
          {deleteError && <Text accessibilityRole="alert" style={styles.error}>Unable to delete this contact. Try again.</Text>}
          {contacts.map((contact) => (
            <View key={contact.id} style={styles.card}>
              <View style={styles.contactHeader}>
                <TodayIcon name="medicalBag" size={26} />
                <View style={styles.contactTitle}>
                  <Text style={styles.cardTitle}>{contactName(contact)}</Text>
                  <Text style={styles.category}>{contact.category}</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>{contact.role_specialty}</Text>
              {contact.provider_name && <Text style={styles.subtitle}>{contact.organization_name}</Text>}
              {contact.phone_number && <Text style={styles.subtitle}>{contact.phone_number}</Text>}
              {contact.address && <Text style={styles.subtitle}>{contact.address}</Text>}
              {contact.email && <Text style={styles.subtitle}>{contact.email}</Text>}
              {contact.notes && <Text style={styles.subtitle}>{contact.notes}</Text>}
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${contactName(contact)}`}
                  disabled={Boolean(deletingId)} style={styles.inline} onPress={() => {
                    onPageChange();
                    setEditor(contact);
                  }}>
                  <Text style={styles.link}>Edit</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${contactName(contact)}`}
                  disabled={Boolean(deletingId)} style={styles.inline} onPress={() => confirmDelete(contact)}>
                  <Text style={styles.error}>{deletingId === contact.id ? 'Deleting…' : 'Delete'}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </>
  );
}

function contactName(contact: Contact) {
  return contact.provider_name ?? contact.organization_name;
}

const fields = [
  { key: 'provider_name', label: 'Provider Name (optional)', keyboard: 'default' },
  { key: 'role_specialty', label: 'Role / Specialty', keyboard: 'default' },
  { key: 'phone_number', label: 'Phone Number (optional)', keyboard: 'phone-pad' },
  { key: 'organization_name', label: 'Clinic / Organization Name', keyboard: 'default' },
  { key: 'address', label: 'Address (optional)', keyboard: 'default' },
  { key: 'email', label: 'Email (optional)', keyboard: 'email-address' },
  { key: 'notes', label: 'Notes (optional)', keyboard: 'default' },
] as const;

function ContactForm({ caregiverId, recipientId, recipientLabel, contact, onCancel, onSaved }: {
  caregiverId: string;
  recipientId: string;
  recipientLabel: string;
  contact?: Contact;
  onCancel: () => void;
  onSaved: (contact: Contact) => void;
}) {
  const [category, setCategory] = useState<Contact['category'] | undefined>(contact?.category);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [values, setValues] = useState(() => ({
    provider_name: contact?.provider_name ?? '',
    role_specialty: contact?.role_specialty ?? '',
    phone_number: contact?.phone_number ?? '',
    organization_name: contact?.organization_name ?? '',
    address: contact?.address ?? '',
    email: contact?.email ?? '',
    notes: contact?.notes ?? '',
  }));
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);

  async function saveContact() {
    if (saving.current) return;

    const role = values.role_specialty.trim();
    const organization = values.organization_name.trim();
    const email = values.email.trim();
    if (!category || !role || !organization) {
      setErrorMessage('Select a category and enter a role or specialty and an organization name.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Enter a valid email address or leave it blank.');
      return;
    }

    const payload = {
      category,
      provider_name: values.provider_name.trim() || null,
      role_specialty: role,
      phone_number: values.phone_number.trim() || null,
      organization_name: organization,
      address: values.address.trim() || null,
      email: email || null,
      notes: values.notes.trim() || null,
    };

    saving.current = true;
    setIsSaving(true);
    setErrorMessage('');
    setCategoryOpen(false);
    Keyboard.dismiss();
    try {
      const request = contact
        ? supabase.from('care_team_contacts').update(payload)
          .eq('id', contact.id).eq('caregiver_id', caregiverId).eq('care_recipient_id', recipientId)
        : supabase.from('care_team_contacts').insert({
          ...payload, caregiver_id: caregiverId, care_recipient_id: recipientId,
        });
      const { data, error } = await request.select(contactColumns).single();
      if (error) throw error;
      onSaved(data);
    } catch {
      setErrorMessage('Unable to save this contact. Try again.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>{contact ? 'Edit contact' : 'Add contact'}</Text>
      <Text style={styles.subtitle}>{recipientLabel}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
        <Pressable accessibilityRole="combobox" accessibilityLabel="Category"
          accessibilityValue={{ text: category ?? 'Select a category' }}
          accessibilityState={{ expanded: categoryOpen, disabled: isSaving }}
          disabled={isSaving} onPress={() => setCategoryOpen((open) => !open)} style={styles.trigger}>
          <Text style={styles.link}>{category ?? 'Select a category'}</Text>
          <TodayIcon name="chevron" size={17} />
        </Pressable>
        {categoryOpen && (
          <View accessibilityRole="radiogroup" style={styles.options}>
            {categories.map((item) => (
              <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: category === item }}
                onPress={() => {
                  setCategory(item);
                  setCategoryOpen(false);
                }}
                style={[styles.option, category === item && styles.pressed]}>
                <Text style={styles.link}>{item}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {fields.map(({ key, label, keyboard }) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            {key === 'provider_name' && (
              <Text style={styles.hint}>For a business, leave this blank and enter its name under Clinic / Organization Name.</Text>
            )}
            <TextInput
              accessibilityLabel={label}
              keyboardType={keyboard}
              autoCapitalize={key === 'email' ? 'none' : 'sentences'}
              autoCorrect={key !== 'email'}
              returnKeyType="done"
              multiline={key === 'notes'}
              editable={!isSaving}
              value={values[key]}
              onChangeText={(value) => setValues((current) => ({ ...current, [key]: value }))}
              style={[styles.input, key === 'notes' && styles.notes]}
            />
          </View>
        ))}
        {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
        <Pressable accessibilityRole="button" disabled={isSaving} onPress={saveContact} style={[styles.primary, isSaving && styles.pressed]}>
          <Text style={styles.primaryLabel}>{isSaving ? 'Saving…' : 'Save contact'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isSaving} onPress={onCancel} style={styles.inline}>
          <Text style={styles.link}>Back to Care Team</Text>
        </Pressable>
      </View>
    </>
  );
}

function LoadState({ label, failed, onRetry }: { label: string; failed: boolean; onRetry: () => void }) {
  return failed ? (
    <>
      <Text accessibilityRole="alert" style={styles.error}>Unable to load {label}.</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.inline}>
        <Text style={styles.link}>Try again</Text>
      </Pressable>
    </>
  ) : (
    <ActivityIndicator accessibilityLabel={`Loading ${label}`} color="#653bad" />
  );
}

const styles = StyleSheet.create({
  heading: { color: '#241d40', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#594d67', fontSize: 14, lineHeight: 20 },
  recipientRow: {
    minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: 15, borderWidth: 1, borderColor: '#e8e1f1', backgroundColor: '#faf7ff',
  },
  recipientName: { flex: 1, color: '#241d40', fontSize: 17, fontWeight: '700' },
  chevron: { transform: [{ rotate: '-90deg' }] },
  card: { padding: 14, gap: 8, borderRadius: 15, borderWidth: 1, borderColor: '#e8e1f1', backgroundColor: '#fff' },
  contactHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  contactTitle: { flex: 1, gap: 3 },
  cardTitle: { color: '#241d40', fontSize: 17, fontWeight: '800' },
  category: { color: '#654b86', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  inline: { minHeight: 44, minWidth: 52, alignSelf: 'flex-start', justifyContent: 'center' },
  link: { flexShrink: 1, color: '#512e96', fontSize: 14, fontWeight: '700' },
  primary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#512e96', borderRadius: 11 },
  primaryLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  field: { gap: 5 },
  label: { color: '#413253', fontSize: 15, fontWeight: '700' },
  hint: { color: '#594d67', fontSize: 13, lineHeight: 18 },
  input: {
    minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#d9cce8', color: '#241d40', fontSize: 16,
  },
  notes: { minHeight: 76, textAlignVertical: 'top' },
  trigger: {
    minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbb6e9', backgroundColor: '#f3edf9',
  },
  options: { borderRadius: 10, borderWidth: 1, borderColor: '#e2d5f1', padding: 4 },
  option: { minHeight: 44, paddingHorizontal: 9, justifyContent: 'center', borderRadius: 7 },
  pressed: { opacity: 0.65, backgroundColor: '#ede4f8' },
  error: { color: '#8e2939', fontSize: 14 },
});
