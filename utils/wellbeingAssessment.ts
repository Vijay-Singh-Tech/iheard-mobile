export const CURRENT_WELLBEING_ASSESSMENT_VERSION = 'v1';

export type WellbeingAnswerValue = number;

export type WellbeingQuestion = {
  id: string;
  order: number;
  text: string;
  dimensionKey: string;
  dimensionLabel: string;
};

export type WellbeingAnswerOption = {
  value: WellbeingAnswerValue;
  label: string;
};

export type WellbeingScoreBand = {
  min: number;
  max: number;
  category: string;
  explanation: string;
  nextStep: string;
};

export type WellbeingAssessmentDefinition = {
  version: string;
  title: string;
  prompt: string;
  questions: WellbeingQuestion[];
  answerOptions: WellbeingAnswerOption[];
  scoreBands: WellbeingScoreBand[];
};

export type WellbeingAnswers = Record<string, WellbeingAnswerValue>;

export type WellbeingResult = {
  totalScore: number;
  maximumScore: number;
  category: string;
  explanation: string;
  nextStep: string;
  healthMatrixValues: Record<string, WellbeingAnswerValue>;
};

type AssessmentDefinitionRow = {
  version: string;
  title: string;
  prompt: string;
  questions: unknown;
  answer_options: unknown;
  score_bands: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAnswerValue(value: unknown): value is WellbeingAnswerValue {
  return Number.isInteger(value) && Number(value) >= 0;
}

export function parseWellbeingAssessmentDefinition(
  row: AssessmentDefinitionRow
): WellbeingAssessmentDefinition {
  if (
    !Array.isArray(row.questions) ||
    !Array.isArray(row.answer_options) ||
    !Array.isArray(row.score_bands)
  ) {
    throw new Error('The wellbeing check configuration is invalid.');
  }

  const questions = row.questions.map((question) => {
    if (
      !isRecord(question) ||
      typeof question.id !== 'string' ||
      typeof question.order !== 'number' ||
      typeof question.text !== 'string' ||
      typeof question.dimensionKey !== 'string' ||
      typeof question.dimensionLabel !== 'string'
    ) {
      throw new Error('A wellbeing question is invalid.');
    }

    return question as WellbeingQuestion;
  });

  const answerOptions = row.answer_options.map((option) => {
    if (
      !isRecord(option) ||
      !isAnswerValue(option.value) ||
      typeof option.label !== 'string'
    ) {
      throw new Error('A wellbeing answer option is invalid.');
    }

    return option as WellbeingAnswerOption;
  });

  const scoreBands = row.score_bands.map((band) => {
    if (
      !isRecord(band) ||
      typeof band.min !== 'number' ||
      typeof band.max !== 'number' ||
      typeof band.category !== 'string' ||
      typeof band.explanation !== 'string' ||
      typeof band.nextStep !== 'string'
    ) {
      throw new Error('A wellbeing score band is invalid.');
    }

    return band as WellbeingScoreBand;
  });

  return {
    version: row.version,
    title: row.title,
    prompt: row.prompt,
    questions: questions.sort((a, b) => a.order - b.order),
    answerOptions: answerOptions.sort((a, b) => a.value - b.value),
    scoreBands,
  };
}

export function calculateWellbeingResult(
  definition: WellbeingAssessmentDefinition,
  answers: WellbeingAnswers
): WellbeingResult {
  const allowedAnswerValues = new Set(
    definition.answerOptions.map((option) => option.value)
  );
  const unansweredQuestion = definition.questions.find(
    (question) => !allowedAnswerValues.has(answers[question.id])
  );

  if (unansweredQuestion) {
    throw new Error('Answer every wellbeing question before continuing.');
  }

  const totalScore = definition.questions.reduce(
    (total, question) => total + answers[question.id],
    0
  );
  const scoreBand = definition.scoreBands.find(
    (band) => totalScore >= band.min && totalScore <= band.max
  );

  if (!scoreBand) {
    throw new Error('The wellbeing score configuration is incomplete.');
  }

  const healthMatrixValues = definition.questions.reduce<
    Record<string, WellbeingAnswerValue>
  >((values, question) => {
    values[question.dimensionKey] = answers[question.id];
    return values;
  }, {});

  return {
    totalScore,
    maximumScore: Math.max(...definition.scoreBands.map((band) => band.max)),
    category: scoreBand.category,
    explanation: scoreBand.explanation,
    nextStep: scoreBand.nextStep,
    healthMatrixValues,
  };
}
