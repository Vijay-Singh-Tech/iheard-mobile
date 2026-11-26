import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Keyboard, Linking, Pressable, StyleSheet, View,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';

import type { CareRecipient } from '../App';
import TodayIcon from '../components/TodayIcon';
import { supabase } from '../services/supabase';
import { recipientTitle } from './CareRecipientsEditor';

const categories = [
  'Family & Friends', 'Support Groups', 'Practical Help', 'Emotional Support', 'Community Organizations',
];
const relationships = [
  'Spouse/Partner', 'Parent', 'Sibling', 'Sister', 'Brother', 'Child', 'Other family',
  'Friend', 'Neighbor', 'Support group', 'Community organization', 'Other',
];
const availabilityOptions = ['Weekdays', 'Weekends', 'Anytime', 'Emergencies', 'Other'];

type Contact = {
  id: string;
  name: string;
  relationship: string;
  categories: string[];
  phone_number: string | null;
  email: string | null;
  location: string | null;
  how_can_they_help: string | null;
  notes: string | null;
  availability: string | null;
  supports_caregiver: boolean;
  is_go_to: boolean;
  support_contact_recipients: { care_recipient_id: string }[];
};

type SavedContact = Omit<Contact, 'id' | 'support_contact_recipients'>;

const contactColumns = [
  'id', 'name', 'relationship', 'categories', 'phone_number', 'email', 'location',
  'how_can_they_help', 'notes', 'availability', 'supports_caregiver', 'is_go_to',
  'support_contact_recipients(care_recipient_id)',
].join(', ');

function dialNumber(phone: string) {
  const number = phone.replace(/[\s().-]/g, '');
  return /^\+?\d{3,15}$/.test(number) ? number : null;
}

async function openContactApp(url: string, kind: 'phone' | 'email') {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(`Unable to open the ${kind} app`, 'Check that this device has an app set up for this action.');
  }
}

export default function SupportNetworkScreen({ caregiverId, onPageChange }: {
  caregiverId: string;
  onPageChange: () => void;
}) {
  const [data, setData] = useState<{ contacts: Contact[]; recipients: CareRecipient[] }>();
  const [editor, setEditor] = useState<Contact | 'new'>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [deletingId, setDeletingId] = useState<string>();
  const [deleteFailed, setDeleteFailed] = useState(false);
  const deleting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadNetwork() {
      try {
        const [contacts, recipients] = await Promise.all([
          supabase.from('support_contacts').select(contactColumns)
            .eq('caregiver_id', caregiverId).order('is_go_to', { ascending: false })
            .order('created_at', { ascending: true }).order('id', { ascending: true })
            .abortSignal(controller.signal),
          supabase.from('care_recipients').select('id, preferred_name, relationship, primary_condition')
            .eq('caregiver_id', caregiverId).order('created_at', { ascending: true })
            .order('id', { ascending: true }).abortSignal(controller.signal),
        ]);
        if (contacts.error || recipients.error) throw contacts.error ?? recipients.error;
        if (!controller.signal.aborted) {
          setData({ contacts: contacts.data as unknown as Contact[], recipients: recipients.data });
        }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }

    void loadNetwork();
    return () => controller.abort();
  }, [attempt, caregiverId]);

  function closeEditor() {
    Keyboard.dismiss();
    onPageChange();
    setEditor(undefined);
  }

  async function deleteContact(contact: Contact) {
    if (deleting.current) return;
    deleting.current = true;
    setDeletingId(contact.id);
    setDeleteFailed(false);
    try {
      const { error } = await supabase.from('support_contacts').delete()
        .eq('id', contact.id).eq('caregiver_id', caregiverId);
      if (error) throw error;
      setData((current) => current && ({
        ...current, contacts: current.contacts.filter(({ id }) => id !== contact.id),
      }));
    } catch {
      setDeleteFailed(true);
    } finally {
      deleting.current = false;
      setDeletingId(undefined);
    }
  }

  function confirmDelete(contact: Contact) {
    Alert.alert(
      `Delete ${contact.name}?`,
      'This permanently removes this person or organization from your Support Network.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteContact(contact) },
      ],
      { cancelable: true },
    );
  }

  if (editor && data) {
    return (
      <SupportContactForm
        contact={editor === 'new' ? undefined : editor}
        recipients={data.recipients}
        onCancel={closeEditor}
        onSaved={(saved) => {
          setData((current) => {
            if (!current) return current;
            const contacts = editor === 'new'
              ? [...current.contacts, saved]
              : current.contacts.map((item) => item.id === saved.id ? saved : item);
            contacts.sort((a, b) => Number(b.is_go_to) - Number(a.is_go_to));
            return { ...current, contacts };
          });
          closeEditor();
        }}
      />
    );
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>Support Network</Text>
      <Text style={styles.detail}>Keep the people and organizations you can turn to in one place.</Text>
      {!data ? failed ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>Unable to load your support network.</Text>
          <Pressable accessibilityRole="button" onPress={() => {
            setFailed(false);
            setAttempt((value) => value + 1);
          }} style={styles.inline}>
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <ActivityIndicator accessibilityLabel="Loading Support Network" color="#653bad" />
      ) : (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Add support contact"
            disabled={Boolean(deletingId)} style={[styles.primary, deletingId && styles.pressed]} onPress={() => {
              onPageChange();
              setEditor('new');
            }}>
            <Text style={styles.primaryLabel}>＋ Add support contact</Text>
          </Pressable>
          {data.contacts.length === 0 && <Text style={styles.detail}>No support contacts saved yet.</Text>}
          {deleteFailed && <Text accessibilityRole="alert" style={styles.error}>Unable to delete this support contact. Try again.</Text>}
          {data.contacts.map((contact) => {
            const recipientIds = new Set(contact.support_contact_recipients.map(({ care_recipient_id }) => care_recipient_id));
            const supports = [
              ...(contact.supports_caregiver ? ['Me'] : []),
              ...data.recipients.filter(({ id }) => recipientIds.has(id)).map(recipientTitle),
            ];
            return (
              <SupportContactCard
                key={contact.id}
                contact={contact}
                supports={supports}
                busy={Boolean(deletingId)}
                isDeleting={deletingId === contact.id}
                onEdit={() => {
                  onPageChange();
                  setEditor(contact);
                }}
                onDelete={() => confirmDelete(contact)}
              />
            );
          })}
        </>
      )}
    </>
  );
}

function SupportContactCard({ contact, supports, busy, isDeleting, onEdit, onDelete }: {
  contact: Contact;
  supports: string[];
  busy: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const phone = contact.phone_number ? dialNumber(contact.phone_number) : null;

  return (
    <View style={[styles.card, contact.is_go_to && styles.goToCard]}>
      <View style={styles.cardHeader}>
        <TodayIcon name={contact.is_go_to ? 'heart' : 'support'} size={26} />
        <View style={styles.cardCopy}>
          {contact.is_go_to && <Text style={styles.badge}>My Go-To Support Person</Text>}
          <Text style={styles.cardTitle}>{contact.name}</Text>
          <Text style={styles.detail}>{contact.relationship}</Text>
        </View>
      </View>
      <Text style={styles.categoryText}>{contact.categories.join(' · ')}</Text>
      <Text style={styles.detail}>Support for: {supports.length ? supports.join(', ') : 'No recipient assigned'}</Text>
      {contact.availability && <Text style={styles.detail}>Availability: {contact.availability}</Text>}
      {contact.location && <Text style={styles.detail}>{contact.location}</Text>}
      {contact.how_can_they_help && <Text style={styles.detail}>{contact.how_can_they_help}</Text>}
      {contact.notes && <Text style={styles.detail}>Notes: {contact.notes}</Text>}
      {contact.phone_number && <Text style={styles.detail}>{contact.phone_number}</Text>}
      {contact.email && <Text style={styles.detail}>{contact.email}</Text>}
      <View style={styles.actions}>
        {phone && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Call ${contact.name}`}
            onPress={() => void openContactApp(`tel:${phone}`, 'phone')} style={styles.inline}>
            <Text style={styles.link}>Call</Text>
          </Pressable>
        )}
        {contact.email && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Email ${contact.name}`}
            onPress={() => void openContactApp(`mailto:${encodeURIComponent(contact.email!).replace('%40', '@')}`, 'email')}
            style={styles.inline}>
            <Text style={styles.link}>Email</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${contact.name}`}
          disabled={busy} onPress={onEdit} style={styles.inline}>
          <Text style={styles.link}>Edit</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${contact.name}`}
          disabled={busy} onPress={onDelete} style={styles.inline}>
          <Text style={styles.error}>{isDeleting ? 'Deleting…' : 'Delete'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const textFields = [
  { key: 'name', label: 'Name or Organization', keyboard: 'default' },
  { key: 'phone_number', label: 'Phone Number (optional)', keyboard: 'phone-pad' },
  { key: 'email', label: 'Email (optional)', keyboard: 'email-address' },
  { key: 'location', label: 'Location (optional)', keyboard: 'default' },
  { key: 'how_can_they_help', label: 'How Can They Help?', keyboard: 'default', multiline: true },
  { key: 'notes', label: 'Notes (optional)', keyboard: 'default', multiline: true },
] as const;

function SupportContactForm({ contact, recipients, onCancel, onSaved }: {
  contact?: Contact;
  recipients: CareRecipient[];
  onCancel: () => void;
  onSaved: (contact: Contact) => void;
}) {
  const [texts, setTexts] = useState(() => ({
    name: contact?.name ?? '',
    phone_number: contact?.phone_number ?? '',
    email: contact?.email ?? '',
    location: contact?.location ?? '',
    how_can_they_help: contact?.how_can_they_help ?? '',
    notes: contact?.notes ?? '',
  }));
  const [relationship, setRelationship] = useState(contact?.relationship ?? '');
  const [selectedCategories, setSelectedCategories] = useState(contact?.categories ?? []);
  const [availability, setAvailability] = useState(contact?.availability ?? '');
  const [supportsCaregiver, setSupportsCaregiver] = useState(contact?.supports_caregiver ?? true);
  const [recipientIds, setRecipientIds] = useState(() =>
    contact?.support_contact_recipients.map(({ care_recipient_id }) => care_recipient_id) ?? []);
  const [isGoTo, setIsGoTo] = useState(contact?.is_go_to ?? false);
  const [openPicker, setOpenPicker] = useState<'relationship' | 'availability'>();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const saving = useRef(false);

  function togglePicker(picker: typeof openPicker) {
    Keyboard.dismiss();
    setOpenPicker((current) => current === picker ? undefined : picker);
  }

  async function saveContact() {
    if (saving.current) return;

    const name = texts.name.trim();
    const phone = texts.phone_number.trim();
    const email = texts.email.trim();
    if (!name || !relationship || selectedCategories.length === 0) {
      setErrorMessage('Enter a name, choose a relationship, and select at least one support category.');
      return;
    }
    if (!supportsCaregiver && recipientIds.length === 0) {
      setErrorMessage('Select who this contact supports.');
      return;
    }
    if (phone && !dialNumber(phone)) {
      setErrorMessage('Enter a phone number with 3–15 digits, or leave it blank.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Enter a valid email address, or leave it blank.');
      return;
    }

    const saved: SavedContact = {
      name,
      relationship,
      categories: categories.filter((item) => selectedCategories.includes(item)),
      phone_number: phone || null,
      email: email || null,
      location: texts.location.trim() || null,
      how_can_they_help: texts.how_can_they_help.trim() || null,
      notes: texts.notes.trim() || null,
      availability: availability || null,
      supports_caregiver: supportsCaregiver,
      is_go_to: isGoTo,
    };

    saving.current = true;
    setIsSaving(true);
    setErrorMessage('');
    setOpenPicker(undefined);
    Keyboard.dismiss();

    try {
      const { data, error } = await supabase.rpc('save_support_contact', {
        p_contact_id: contact?.id ?? null,
        p_name: saved.name,
        p_relationship: saved.relationship,
        p_categories: saved.categories,
        p_phone_number: saved.phone_number,
        p_email: saved.email,
        p_location: saved.location,
        p_how_can_they_help: saved.how_can_they_help,
        p_notes: saved.notes,
        p_availability: saved.availability,
        p_supports_caregiver: saved.supports_caregiver,
        p_is_go_to: saved.is_go_to,
        p_recipient_ids: recipientIds,
      });
      if (error || typeof data !== 'string') throw error ?? new Error('Contact was not saved');
      onSaved({
        ...saved,
        id: data,
        support_contact_recipients: recipientIds.map((id) => ({ care_recipient_id: id })),
      });
    } catch {
      setErrorMessage('Unable to save this support contact. Try again.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  function renderField(field: (typeof textFields)[number]) {
    const { key, label, keyboard } = field;
    const multiline = 'multiline' in field;
    return (
      <View key={key} style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput accessibilityLabel={label} value={texts[key]} keyboardType={keyboard}
          onChangeText={(value) => setTexts((current) => ({ ...current, [key]: value }))}
          editable={!isSaving} multiline={multiline} returnKeyType="done"
          autoCapitalize={key === 'email' ? 'none' : 'sentences'}
          autoCorrect={key !== 'email'}
          style={[styles.input, multiline && styles.multiline]} />
      </View>
    );
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>{contact ? 'Edit support contact' : 'Add support contact'}</Text>
      <View pointerEvents={isSaving ? 'none' : 'auto'} style={styles.card}>
        {renderField(textFields[0])}
        <Picker label="Relationship" value={relationship} options={relationships}
          open={openPicker === 'relationship'} onToggle={() => togglePicker('relationship')}
          onSelect={(value) => { setRelationship(value); setOpenPicker(undefined); }} />
        <Text style={styles.label}>Support Categories</Text>
        <Text style={styles.detail}>Select all that apply.</Text>
        <View style={styles.choiceList}>
          {categories.map((item) => (
            <Choice key={item} label={item} checked={selectedCategories.includes(item)}
              onPress={() => setSelectedCategories((current) => toggleValue(current, item))} />
          ))}
        </View>
        {textFields.slice(1).map(renderField)}
        <Picker label="Availability (optional)" value={availability} options={['', ...availabilityOptions]}
          open={openPicker === 'availability'} onToggle={() => togglePicker('availability')}
          onSelect={(value) => { setAvailability(value); setOpenPicker(undefined); }} />
        <Text style={styles.label}>Support For</Text>
        <View style={styles.choiceList}>
          <Choice label="Me, the caregiver" checked={supportsCaregiver}
            onPress={() => setSupportsCaregiver((value) => !value)} />
          {recipients.map((recipient) => (
            <Choice key={recipient.id} label={recipientTitle(recipient)} checked={recipientIds.includes(recipient.id)}
              onPress={() => setRecipientIds((current) => toggleValue(current, recipient.id))} />
          ))}
        </View>
        <Choice label="My Go-To Support Person" checked={isGoTo} onPress={() => setIsGoTo((value) => !value)} />
        {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
        <Pressable accessibilityRole="button" disabled={isSaving} onPress={saveContact} style={[styles.primary, isSaving && styles.pressed]}>
          <Text style={styles.primaryLabel}>{isSaving ? 'Saving…' : 'Save support contact'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isSaving} onPress={onCancel} style={styles.inline}>
          <Text style={styles.link}>Back to Support Network</Text>
        </Pressable>
      </View>
    </>
  );
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Choice({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }}
      onPress={onPress} style={[styles.option, checked && styles.selected]}>
      <View style={styles.checkbox}>{checked && <TodayIcon name="check" size={17} />}</View>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

function Picker({ label, value, options, open, onToggle, onSelect }: {
  label: string; value: string; options: string[]; open: boolean;
  onToggle: () => void; onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="combobox" accessibilityLabel={label}
        accessibilityValue={{ text: value || 'Select an option' }} accessibilityState={{ expanded: open }}
        onPress={onToggle} style={styles.trigger}>
        <Text style={styles.link}>{value || 'Select an option'}</Text>
        <TodayIcon name="chevron" size={17} />
      </Pressable>
      {open && (
        <View accessibilityRole="radiogroup" style={styles.choiceList}>
          {options.map((item) => (
            <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: value === item }}
              onPress={() => onSelect(item)} style={[styles.option, value === item && styles.selected]}>
              <Text style={styles.link}>{item || 'Not provided'}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: '#241d40', fontSize: 26, fontWeight: '800' },
  detail: { color: '#594d67', fontSize: 14, lineHeight: 20 },
  card: { padding: 14, gap: 8, borderRadius: 15, borderWidth: 1, borderColor: '#e8e1f1', backgroundColor: '#fff' },
  goToCard: { backgroundColor: '#f3edf9', borderColor: '#dfd1ef' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardCopy: { flex: 1, gap: 2 },
  cardTitle: { color: '#241d40', fontSize: 18, fontWeight: '800' },
  badge: { color: '#654496', fontSize: 12, fontWeight: '800' },
  categoryText: { color: '#654496', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 7 },
  inline: { minHeight: 44, minWidth: 48, alignSelf: 'flex-start', justifyContent: 'center' },
  link: { flexShrink: 1, color: '#512e96', fontSize: 14, fontWeight: '700' },
  primary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#512e96', borderRadius: 11 },
  primaryLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#8e2939', fontSize: 14 },
  field: { gap: 5 },
  label: { color: '#413253', fontSize: 15, fontWeight: '700' },
  input: {
    minHeight: 46, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#d9cce8', color: '#241d40', fontSize: 16,
  },
  multiline: { minHeight: 66, textAlignVertical: 'top' },
  choiceList: { borderRadius: 10, borderWidth: 1, borderColor: '#e2d5f1', padding: 4 },
  option: { minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 9, borderRadius: 7 },
  selected: { backgroundColor: '#ede4f8' },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1, borderColor: '#b39acc', alignItems: 'center', justifyContent: 'center' },
  trigger: {
    minHeight: 46, paddingHorizontal: 12, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    borderWidth: 1, borderColor: '#cbb6e9', backgroundColor: '#f3edf9',
  },
  pressed: { opacity: 0.65 },
});
