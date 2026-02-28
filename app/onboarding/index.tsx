import { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../../lib/auth";
import { getOnboardingState } from "../../lib/onboarding";
import type { OnboardingStep, ChatMessage, CollectedData, InterestCategory } from "../../types/onboarding";
import StepProfile from "./StepProfile";
import StepChat from "./StepChat";
import StepInterests from "./StepInterests";
import StepCareers from "./StepCareers";
import StepSettings from "./StepSettings";

const STEPS: OnboardingStep[] = ['profile', 'chat', 'interests', 'careers', 'settings'];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [collectedData, setCollectedData] = useState<Partial<CollectedData>>({});
  const [interests, setInterests] = useState<InterestCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Resume from saved state
  useEffect(() => {
    if (!user) return;
    getOnboardingState(user.id).then((state) => {
      if (state) {
        setCurrentStep(state.current_step as OnboardingStep);
        setChatHistory(state.chat_history ?? []);
        setCollectedData(state.collected_data ?? {});
      }
      setLoading(false);
    });
  }, [user]);

  const stepIndex = STEPS.indexOf(currentStep);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#BFFF00" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[styles.dot, i <= stepIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {currentStep === 'profile' && (
        <StepProfile
          userId={user!.id}
          onComplete={(data) => {
            setCollectedData(data);
            setCurrentStep('chat');
          }}
        />
      )}
      {currentStep === 'chat' && (
        <StepChat
          userId={user!.id}
          userName={user?.user_metadata?.full_name?.split(' ')[0] ?? 'there'}
          educationLevel={collectedData.education_level ?? 'high_school'}
          chatHistory={chatHistory}
          onChatHistoryUpdate={setChatHistory}
          onComplete={() => setCurrentStep('interests')}
        />
      )}
      {currentStep === 'interests' && (
        <StepInterests
          userId={user!.id}
          userName={user?.user_metadata?.full_name?.split(' ')[0] ?? 'there'}
          educationLevel={collectedData.education_level ?? 'high_school'}
          chatHistory={chatHistory}
          onComplete={(cats) => {
            setInterests(cats);
            setCurrentStep('careers');
          }}
        />
      )}
      {currentStep === 'careers' && (
        <StepCareers
          userId={user!.id}
          userName={user?.user_metadata?.full_name?.split(' ')[0] ?? 'there'}
          educationLevel={collectedData.education_level ?? 'high_school'}
          interests={interests}
          onComplete={() => setCurrentStep('settings')}
        />
      )}
      {currentStep === 'settings' && (
        <StepSettings userId={user!.id} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0514' },
  loading: { flex: 1, backgroundColor: '#0a0514', justifyContent: 'center', alignItems: 'center' },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 60,
    paddingBottom: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: '#BFFF00' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.2)' },
});
