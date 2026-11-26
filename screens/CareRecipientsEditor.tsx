import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';

import type { CareRecipient } from '../App';
import TodayIcon from '../components/TodayIcon';
import { supabase } from '../services/supabase';

const recipientColumns =
  'id, preferred_name, relationship, primary_condition, other_conditions, age_years, primary_condition_duration, current_status';

type RecipientDetail = CareRecipient & {
  other_conditions: string[];
  age_years: number | null;
  primary_condition_duration: string | null;
  current_status: string | null;
};

const relationships = [
  'Spouse/Partner', 'Mother', 'Father', 'Son', 'Daughter',
  'Grandparent', 'Sibling', 'Friend', 'Other',
];

const commonConditions = [
  "Alzheimer's disease", 'Dementia', "Parkinson's disease", 'Diabetes',
  'Heart disease', 'Stroke', 'Cancer', 'Hypertension', 'Kidney disease',
  'COPD', 'Arthritis', 'Depression', 'Anxiety', 'Multiple sclerosis',
];

const durations = [
  'Less than 6 months', '6–12 months', '1–3 years', '3–5 years',
  'More than 5 years', 'Not sure',
];
const statuses = ['Improving', 'Stable', 'Worsening', 'Not sure'];

function addCondition(conditions: string[], condition: string) {
  const trimmed = condition.trim();
  return trimmed && !conditions.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())
    ? [...conditions, trimmed]
    : conditions;
}

export function recipientTitle(recipient: CareRecipient) {
  return `${recipient.preferred_name} — ${recipient.relationship}`;
}

type CareRecipientsEditorProps = {
  caregiverId: string;
  activeRecipientId?: string;
  onRecipientDeleted: (recipientId: string, nextRecipient: CareRecipient | null) => void;
  onRecipientSaved: (recipient: CareRecipient) => void;
  onEditorOpened: () => void;
};

export default function CareRecipientsEditor({
  caregiverId,
  activeRecipientId,
  onRecipientDeleted,
  onRecipientSaved,
  onEditorOpened,
}: CareRecipientsEditorProps) {
  const [data, setData] = useState<{ recipients: RecipientDetail[]; target: number }>();
  const [editor, setEditor] = useState<RecipientDetail | 'new' | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [deletingId, setDeletingId] = useState<string>();
  const [deleteFailed, setDeleteFailed] = useState(false);
  const isDeleting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecipients() {
      try {
        const [profiles, recipients] = await Promise.all([
          supabase.from('profiles').select('people_cared_for').eq('id', caregiverId)
            .abortSignal(controller.signal).single(),
          supabase.from('care_recipients').select(recipientColumns).eq('caregiver_id', caregiverId)
            .order('created_at', { ascending: true }).order('id', { ascending: true })
            .abortSignal(controller.signal),
        ]);

        if (profiles.error || recipients.error) {
          throw profiles.error ?? recipients.error;
        }

        if (!controller.signal.aborted) {
          const target = profiles.data.people_cared_for ?? 1;
          setData({ recipients: recipients.data, target });
        }
      } catch {
        if (!controller.signal.aborted) {
          setLoadFailed(true);
        }
      }
    }

    void loadRecipients();
    return () => controller.abort();
  }, [caregiverId, attempt]);

  async function deleteRecipient(recipient: RecipientDetail) {
    if (isDeleting.current || !data) {
      return;
    }

    isDeleting.current = true;
    setDeleteFailed(false);
    setDeletingId(recipient.id);

    try {
      const { error } = await supabase.from('care_recipients')
        .delete()
        .eq('id', recipient.id)
        .eq('caregiver_id', caregiverId)
        .select('id')
        .maybeSingle();

      if (error) {
        throw error;
      }

      const recipients = data.recipients.filter((item) => item.id !== recipient.id);
      setData({ ...data, recipients });
      onRecipientDeleted(recipient.id, recipients[0] ?? null);
    } catch {
      setDeleteFailed(true);
    } finally {
      isDeleting.current = false;
      setDeletingId(undefined);
    }
  }

  function confirmDelete(recipient: RecipientDetail) {
    Alert.alert(
      `Delete ${recipientTitle(recipient)}?`,
      'This permanently deletes the recipient, their Care Team contacts, and any linked wellbeing assessments. Linked journal entries are kept in your account, but lose their link to this recipient.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteRecipient(recipient) },
      ],
      { cancelable: true }
    );
  }

  if (!data) {
    return loadFailed ? (
      <>
        <Text accessibilityRole="alert" style={styles.error}>Unable to load care recipients.</Text>
        <Pressable accessibilityRole="button" style={styles.outline} onPress={() => {
          setLoadFailed(false);
          setAttempt((value) => value + 1);
        }}>
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      </>
    ) : (
      <ActivityIndicator accessibilityLabel="Loading care recipients" color="#653bad" />
    );
  }

  if (editor) {
    return (
      <RecipientForm
        caregiverId={caregiverId}
        recipient={editor === 'new' ? undefined : editor}
        onCancel={() => {
          Keyboard.dismiss();
          onEditorOpened();
          setEditor(null);
        }}
        onSaved={(saved) => {
          setData((current) => current && ({
            ...current,
            recipients: editor === 'new'
              ? [...current.recipients, saved]
              : current.recipients.map((item) => item.id === saved.id ? saved : item),
          }));
          Keyboard.dismiss();
          onEditorOpened();
          setEditor(null);
          onRecipientSaved(saved);
        }}
      />
    );
  }

  const atLimit = data.recipients.length >= data.target;

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>Care Recipients</Text>
      <Text style={styles.detail}>{data.recipients.length} saved · Maximum in My Profile: {data.target}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add Care Recipient"
        accessibilityState={{ disabled: atLimit || Boolean(deletingId) }}
        disabled={atLimit || Boolean(deletingId)}
        onPress={() => {
          onEditorOpened();
          setEditor('new');
        }}
        style={[styles.save, (atLimit || deletingId) && styles.disabled]}
      >
        <Text style={styles.saveLabel}>＋ Add Care Recipient</Text>
      </Pressable>
      {atLimit && (
        <Text style={styles.detail}>You’ve reached your recipient limit. To add another, increase the count in My Profile or remove a recipient.</Text>
      )}
      {data.recipients.length === 0 && (
        <Text style={styles.detail}>No care recipients saved yet.</Text>
      )}
      {deleteFailed && <Text accessibilityRole="alert" style={styles.error}>Unable to delete this care recipient. Try again.</Text>}
      {data.recipients.map((recipient) => {
        const active = recipient.id === activeRecipientId;
        const title = recipientTitle(recipient);
        return (
          <View key={recipient.id} style={[styles.row, active && styles.selected]}>
            <View style={styles.recipientHeader}>
              <TodayIcon name="profile" size={28} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{title}</Text>
                {active && <Text style={styles.detail}>Current recipient</Text>}
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${title}`}
                disabled={Boolean(deletingId)}
                onPress={() => {
                  onEditorOpened();
                  setEditor(recipient);
                }}
                style={styles.rowAction}
              >
                <Text style={styles.link}>Edit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${title}`}
                disabled={Boolean(deletingId)}
                onPress={() => confirmDelete(recipient)}
                style={styles.rowAction}
              >
                <Text style={styles.deleteLabel}>{deletingId === recipient.id ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </>
  );
}

type RecipientFormProps = {
  caregiverId: string;
  recipient?: RecipientDetail;
  onCancel: () => void;
  onSaved: (recipient: RecipientDetail) => void;
};

function RecipientForm({ caregiverId, recipient, onCancel, onSaved }: RecipientFormProps) {
  const [name, setName] = useState(recipient?.preferred_name ?? '');
  const [relationship, setRelationship] = useState(recipient?.relationship ?? '');
  const [age, setAge] = useState(recipient?.age_years?.toString() ?? '');
  const [conditions, setConditions] = useState(() =>
    [recipient?.primary_condition ?? '', ...(recipient?.other_conditions ?? [])].reduce(addCondition, [] as string[])
  );
  const [primary, setPrimary] = useState(recipient?.primary_condition ?? '');
  const [duration, setDuration] = useState(recipient?.primary_condition_duration ?? '');
  const [status, setStatus] = useState(recipient?.current_status ?? '');
  const [other, setOther] = useState('');
  const [search, setSearch] = useState('');
  const [openField, setOpenField] = useState<'relationship' | 'conditions' | 'primary' | 'duration' | 'status'>();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);

  const primaryCondition = conditions.includes(primary) ? primary : conditions[0] ?? '';
  const visibleConditions = commonConditions.filter((condition) =>
    condition.toLowerCase().includes(search.trim().toLowerCase())
  );

  function toggleCondition(condition: string) {
    const matches = (entry: string) => entry.toLowerCase() === condition.toLowerCase();
    setConditions((current) => current.some(matches)
      ? current.filter((entry) => !matches(entry))
      : addCondition(current, condition));
    if (matches(primaryCondition)) {
      setPrimary('');
      setDuration('');
    }
  }

  async function saveRecipient() {
    if (saving.current) {
      return;
    }

    const preferredName = name.trim();
    const finalConditions = addCondition(conditions, other);
    const finalPrimary = primaryCondition || finalConditions[0];
    const ageText = age.trim();
    const ageYears = ageText ? Number(ageText) : null;

    if (!preferredName || !relationship || !finalPrimary) {
      setErrorMessage('Enter a name, select a relationship, and add at least one health condition.');
      return;
    }

    if (ageYears !== null && (!/^\d+$/.test(ageText) || ageYears > 130)) {
      setErrorMessage('Enter an age from 0 to 130, or leave it blank.');
      return;
    }

    saving.current = true;
    setIsSaving(true);
    setOpenField(undefined);
    setErrorMessage('');
    try {
      const fields = {
        preferred_name: preferredName,
        relationship,
        age_years: ageYears,
        primary_condition: finalPrimary,
        other_conditions: finalConditions.filter((condition) => condition !== finalPrimary),
        primary_condition_duration: duration || null,
        current_status: status || null,
      };
      let request;
      if (recipient) {
        request = supabase.from('care_recipients').update(fields)
          .eq('id', recipient.id).eq('caregiver_id', caregiverId);
      } else {
        const [profile, recipients] = await Promise.all([
          supabase.from('profiles').select('people_cared_for').eq('id', caregiverId).single(),
          supabase.from('care_recipients').select('id', { count: 'exact', head: true }).eq('caregiver_id', caregiverId),
        ]);
        if (profile.error || recipients.error || recipients.count === null) {
          throw profile.error ?? recipients.error ?? new Error('Recipient count is unavailable');
        }
        if (recipients.count >= (profile.data.people_cared_for ?? 1)) {
          setErrorMessage('You’ve reached the recipient limit in My Profile.');
          return;
        }
        request = supabase.from('care_recipients').insert({
          ...fields, caregiver_id: caregiverId,
        });
      }

      const { data, error } = await request.select(recipientColumns).single();
      if (error) {
        throw error;
      }
      onSaved(data);
    } catch {
      setErrorMessage('Unable to save this care recipient. Try again.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>
        {recipient ? recipientTitle(recipient) : 'Add Care Recipient'}
      </Text>
      <View pointerEvents={isSaving ? 'none' : 'auto'} style={styles.card}>
        <Text style={styles.label}>Name or Preferred Name</Text>
        <TextInput returnKeyType="done" accessibilityLabel="Name or Preferred Name" style={styles.input} value={name}
          onChangeText={setName} editable={!isSaving} autoCapitalize="words" />

        <Picker label="Relationship to You" options={relationships} value={relationship}
          open={openField === 'relationship'}
          onToggle={() => setOpenField(openField === 'relationship' ? undefined : 'relationship')}
          onSelect={(value) => { setRelationship(value); setOpenField(undefined); }} />

        <Text style={styles.label}>Age (optional)</Text>
        <TextInput returnKeyType="done" accessibilityLabel="Age" keyboardType="number-pad" style={styles.input}
          value={age} onChangeText={setAge} editable={!isSaving} />

        <Text style={styles.label}>Health Condition(s)</Text>
        <Text style={styles.detail}>Caregiver-reported information. These conditions have not been medically verified.</Text>
        <Trigger label="Health Condition(s)" value={conditions.length ? `${conditions.length} selected` : 'Search and select conditions'}
          open={openField === 'conditions'}
          onPress={() => {
            if (openField === 'conditions') Keyboard.dismiss();
            setOpenField(openField === 'conditions' ? undefined : 'conditions');
          }} />
        {openField === 'conditions' && (
          <View style={styles.options}>
            <TextInput returnKeyType="done" accessibilityLabel="Search health conditions" placeholder="Search health conditions"
              autoCapitalize="none" style={styles.input} value={search} onChangeText={setSearch} editable={!isSaving} />
            {visibleConditions.length === 0 && <Text style={styles.detail}>No matches. Use Other Health Condition below.</Text>}
            {visibleConditions.map((condition) => {
              const checked = conditions.some((entry) => entry.toLowerCase() === condition.toLowerCase());
              return (
                <Pressable key={condition} accessibilityRole="checkbox" accessibilityState={{ checked }}
                  onPress={() => toggleCondition(condition)} style={[styles.option, checked && styles.selected]}>
                  <Text style={styles.optionText}>{condition}</Text>
                  {checked && <TodayIcon name="check" size={18} />}
                </Pressable>
              );
            })}
          </View>
        )}
        {conditions.map((condition) => (
          <Pressable key={condition} accessibilityRole="button" accessibilityLabel={`Remove ${condition}`}
            onPress={() => toggleCondition(condition)} style={styles.conditionChip}>
            <Text style={styles.link}>{condition}</Text>
            <Text style={styles.link}>×</Text>
          </Pressable>
        ))}

        <Text style={styles.label}>Other Health Condition</Text>
        <TextInput returnKeyType="done" accessibilityLabel="Other Health Condition" placeholder="Enter an unlisted condition"
          style={styles.input} value={other} onChangeText={setOther} editable={!isSaving} />
        {!!other.trim() && (
          <Pressable accessibilityRole="button" style={styles.outline} onPress={() => {
            setConditions((current) => addCondition(current, other));
            setOther('');
          }}>
            <Text style={styles.link}>Add condition</Text>
          </Pressable>
        )}

        {conditions.length <= 1 ? (
          <>
            <Text style={styles.label}>Primary Health Condition</Text>
            <Text style={styles.detail}>{primaryCondition || 'Add a health condition to set the primary condition.'}</Text>
          </>
        ) : (
          <Picker label="Primary Health Condition" options={conditions} value={primaryCondition}
            open={openField === 'primary'}
            onToggle={() => setOpenField(openField === 'primary' ? undefined : 'primary')}
            onSelect={(value) => {
              if (value !== primaryCondition) setDuration('');
              setPrimary(value);
              setOpenField(undefined);
            }} />
        )}
        <Picker label="How Long Have They Had This Condition?" options={['', ...durations]} value={duration}
          hint={primaryCondition ? `For ${primaryCondition} · optional` : 'For the primary condition · optional'}
          open={openField === 'duration'}
          onToggle={() => setOpenField(openField === 'duration' ? undefined : 'duration')}
          onSelect={(value) => { setDuration(value); setOpenField(undefined); }} />
        <Picker label="How Are They Doing Currently?" options={['', ...statuses]} value={status} hint="Caregiver-reported · optional"
          open={openField === 'status'}
          onToggle={() => setOpenField(openField === 'status' ? undefined : 'status')}
          onSelect={(value) => { setStatus(value); setOpenField(undefined); }} />

        {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
        <Pressable accessibilityRole="button" disabled={isSaving} onPress={saveRecipient} style={styles.save}>
          <Text style={styles.saveLabel}>{isSaving ? 'Saving…' : 'Save Care Recipient'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isSaving} onPress={onCancel} style={styles.outline}>
          <Text style={styles.link}>Back to Care Recipients</Text>
        </Pressable>
      </View>
    </>
  );
}

function Trigger({ label, value, open, onPress }: {
  label: string; value: string; open: boolean; onPress: () => void;
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="combobox"
      accessibilityState={{ expanded: open }} accessibilityValue={{ text: value }}
      onPress={onPress} style={styles.trigger}>
      <Text style={styles.optionText}>{value}</Text>
      <TodayIcon name="chevron" size={18} />
    </Pressable>
  );
}

function Picker({ label, options, value, hint, open, onToggle, onSelect }: {
  label: string; options: string[]; value: string; hint?: string; open: boolean;
  onToggle: () => void; onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint && <Text style={styles.detail}>{hint}</Text>}
      <Trigger label={label} value={value || 'Select an option'} open={open} onPress={onToggle} />
      {open && (
        <View accessibilityRole="radiogroup" style={styles.options}>
          {options.map((option) => (
            <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: value === option }}
              onPress={() => onSelect(option)} style={[styles.option, value === option && styles.selected]}>
              <Text style={styles.optionText}>{option || 'Not provided'}</Text>
              {value === option && <TodayIcon name="check" size={18} />}
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
  row: {
    minHeight: 62, gap: 5,
    padding: 12, borderRadius: 15, borderWidth: 1, borderColor: '#e8e1f1', backgroundColor: '#fbfaff',
  },
  recipientHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  rowAction: { minHeight: 44, minWidth: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  deleteLabel: { color: '#8e2939', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: '#241d40', fontSize: 17, fontWeight: '800' },
  card: { padding: 14, gap: 8, borderRadius: 15, borderWidth: 1, borderColor: '#e8e1f1', backgroundColor: '#fff' },
  field: { gap: 5 },
  label: { color: '#413253', fontSize: 15, fontWeight: '700' },
  input: {
    minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#d9cce8', color: '#241d40', backgroundColor: '#fff', fontSize: 16,
  },
  trigger: {
    minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1, borderColor: '#cbb6e9', backgroundColor: '#f3edf9',
  },
  options: { borderRadius: 10, borderWidth: 1, borderColor: '#e2d5f1', backgroundColor: '#faf7ff', padding: 4, gap: 2 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 7 },
  optionText: { flex: 1, color: '#512e96', fontSize: 15 },
  selected: { backgroundColor: '#ede4f8' },
  conditionChip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    minHeight: 44, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f4eefb',
  },
  outline: {
    minHeight: 46, justifyContent: 'center', alignItems: 'center', padding: 8,
    borderRadius: 11, borderWidth: 1, borderColor: '#c5b3e1', backgroundColor: '#f9f5ff',
  },
  link: { color: '#512e96', fontSize: 14, fontWeight: '700' },
  save: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#512e96', borderRadius: 11 },
  saveLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#8e2939', fontSize: 14 },
});
