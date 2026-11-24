import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { CareRecipient } from '../App';
import { supabase } from '../services/supabase';
import {
  calculateWellbeingResult,
  CURRENT_WELLBEING_ASSESSMENT_VERSION,
  parseWellbeingAssessmentDefinition,
} from '../utils/wellbeingAssessment';
import type {
  WellbeingAnswers,
  WellbeingAnswerValue,
  WellbeingAssessmentDefinition,
  WellbeingResult,
} from '../utils/wellbeingAssessment';

type WellbeingCheckScreenProps = {
  careRecipient: CareRecipient;
  onReturnHome: () => void;
  returnLabel?: string;
};

export default function WellbeingCheckScreen({
  careRecipient,
  onReturnHome,
  returnLabel = 'Return to Today',
}: WellbeingCheckScreenProps) {
  const [definition, setDefinition] =
    useState<WellbeingAssessmentDefinition>();
  const [answers, setAnswers] = useState<WellbeingAnswers>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState<WellbeingResult>();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDefinition() {
      const { data, error } = await supabase
        .from('wellbeing_assessment_versions')
        .select(
          'version, title, prompt, questions, answer_options, score_bands'
        )
        .eq('version', CURRENT_WELLBEING_ASSESSMENT_VERSION)
        .eq('is_active', true)
        .single();

      if (!isMounted) {
        return;
      }

      if (error) {
        setFeedback(`Unable to load the wellbeing check: ${error.message}`);
        return;
      }

      try {
        setDefinition(parseWellbeingAssessmentDefinition(data));
      } catch (configurationError) {
        setFeedback(
          configurationError instanceof Error
            ? configurationError.message
            : 'Unable to load the wellbeing check.'
        );
      }
    }

    loadDefinition().catch(() => {
      if (isMounted) {
        setFeedback('Unable to load the wellbeing check. Please try again.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!definition) {
    return (
      <View style={styles.loadingScreen}>
        {feedback ? (
          <>
            <Text style={styles.errorMessage}>{feedback}</Text>
            <Pressable
              onPress={onReturnHome}
              style={[styles.secondaryButton, styles.standaloneButton]}
            >
              <Text style={styles.secondaryButtonText}>{returnLabel}</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color="#147d6f" size="large" />
        )}
      </View>
    );
  }

  const assessmentDefinition = definition;

  if (result) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>iHeard</Text>
          <Text style={styles.title}>Your wellbeing check is complete.</Text>
          <Text style={styles.disclaimer}>
            This MVP wellbeing check is not a clinical assessment or diagnosis.
          </Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Total score</Text>
            <Text style={styles.score}>
              {result.totalScore} / {result.maximumScore}
            </Text>
            <Text style={styles.category}>{result.category}</Text>
          </View>

          <Text style={styles.resultText}>{result.explanation}</Text>
          <Text style={styles.nextStepLabel}>One possible next step</Text>
          <Text style={styles.resultText}>{result.nextStep}</Text>

          <Pressable
            onPress={onReturnHome}
            style={[styles.primaryButton, styles.resultButton]}
          >
            <Text style={styles.primaryButtonText}>{returnLabel}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const question = definition.questions[questionIndex];
  const selectedAnswer = answers[question.id];
  const isLastQuestion = questionIndex === definition.questions.length - 1;

  function handleAnswer(value: WellbeingAnswerValue) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [question.id]: value,
    }));
    setFeedback(null);
  }

  async function handleNext() {
    if (selectedAnswer === undefined) {
      setFeedback('Choose an answer before continuing.');
      return;
    }

    if (!isLastQuestion) {
      setQuestionIndex((currentIndex) => currentIndex + 1);
      setFeedback(null);
      return;
    }

    setFeedback(null);
    setIsSaving(true);

    try {
      const calculatedResult = calculateWellbeingResult(
        assessmentDefinition,
        answers
      );
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setFeedback(
          userError?.message ?? 'You must be signed in to save this check.'
        );
        return;
      }

      const { error: saveError } = await supabase
        .from('wellbeing_checkins')
        .insert({
          caregiver_id: user.id,
          care_recipient_id: careRecipient.id,
          assessment_version: assessmentDefinition.version,
          responses: answers,
          total_score: calculatedResult.totalScore,
          mvp_category: calculatedResult.category,
          health_matrix_values: calculatedResult.healthMatrixValues,
        });

      if (saveError) {
        setFeedback(`Unable to save the wellbeing check: ${saveError.message}`);
        return;
      }

      setResult(calculatedResult);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to save the wellbeing check. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (questionIndex === 0) {
      onReturnHome();
      return;
    }

    setQuestionIndex((currentIndex) => currentIndex - 1);
    setFeedback(null);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.screen}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>iHeard</Text>
        <Text style={styles.progress}>
          Question {questionIndex + 1} of {definition.questions.length}
        </Text>
        <Text style={styles.title}>{definition.title}</Text>
        <Text style={styles.prompt}>{definition.prompt}</Text>
        <Text style={styles.question}>{question.text}</Text>

        <View style={styles.answers}>
          {definition.answerOptions.map((option) => {
            const isSelected = selectedAnswer === option.value;

            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={option.value}
                onPress={() => handleAnswer(option.value)}
                style={[
                  styles.answerButton,
                  isSelected && styles.answerButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.answerValue,
                    isSelected && styles.answerTextSelected,
                  ]}
                >
                  {option.value}
                </Text>
                <Text
                  style={[
                    styles.answerLabel,
                    isSelected && styles.answerTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {feedback ? <Text style={styles.errorMessage}>{feedback}</Text> : null}

        <View style={styles.navigationButtons}>
          <Pressable
            disabled={isSaving}
            onPress={handleBack}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {questionIndex === 0 ? returnLabel : 'Back'}
            </Text>
          </Pressable>

          <Pressable
            disabled={isSaving}
            onPress={handleNext}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSaving) && styles.buttonMuted,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isLastQuestion ? 'Complete check' : 'Next'}
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          This is an MVP wellbeing check, not a clinical assessment or
          diagnosis.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f7f6',
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 24,
  },
  eyebrow: {
    marginBottom: 8,
    color: '#147d6f',
    fontSize: 16,
    fontWeight: '700',
  },
  progress: {
    color: '#147d6f',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    marginTop: 8,
    color: '#122522',
    fontSize: 28,
    fontWeight: '700',
  },
  prompt: {
    marginTop: 12,
    color: '#5e6f6c',
    fontSize: 15,
    lineHeight: 22,
  },
  question: {
    marginTop: 28,
    color: '#122522',
    fontSize: 21,
    fontWeight: '600',
    lineHeight: 29,
  },
  answers: {
    marginTop: 24,
    gap: 10,
  },
  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#cbd8d5',
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  answerButtonSelected: {
    borderColor: '#147d6f',
    backgroundColor: '#147d6f',
  },
  answerValue: {
    width: 28,
    color: '#147d6f',
    fontSize: 16,
    fontWeight: '700',
  },
  answerLabel: {
    color: '#253d39',
    fontSize: 16,
  },
  answerTextSelected: {
    color: '#ffffff',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#147d6f',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#147d6f',
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#147d6f',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  standaloneButton: {
    flex: 0,
    width: '100%',
    marginTop: 20,
  },
  resultButton: {
    flex: 0,
    marginTop: 24,
  },
  buttonMuted: {
    opacity: 0.7,
  },
  errorMessage: {
    marginTop: 16,
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    marginTop: 20,
    color: '#71817e',
    fontSize: 13,
    lineHeight: 19,
  },
  resultCard: {
    alignItems: 'center',
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: '#eef5f3',
    padding: 20,
  },
  resultLabel: {
    color: '#5e6f6c',
    fontSize: 14,
  },
  score: {
    marginTop: 4,
    color: '#122522',
    fontSize: 32,
    fontWeight: '700',
  },
  category: {
    marginTop: 6,
    color: '#147d6f',
    fontSize: 18,
    fontWeight: '700',
  },
  resultText: {
    marginTop: 16,
    color: '#253d39',
    fontSize: 16,
    lineHeight: 23,
  },
  nextStepLabel: {
    marginTop: 22,
    color: '#122522',
    fontSize: 16,
    fontWeight: '700',
  },
});
