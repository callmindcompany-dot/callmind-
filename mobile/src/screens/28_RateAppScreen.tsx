import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { ArrowLeft, Star } from 'lucide-react-native';

interface RateAppProps {
  onBack: () => void;
}

export const RateAppScreen: React.FC<RateAppProps> = ({ onBack }) => {
  const [rating, setRating] = useState(4);
  const [feedbackText, setFeedbackText] = useState(
    'This app is very helpful and easy to use. It makes my work much more productive!'
  );

  const handleSubmit = () => {
    Alert.alert('Thank You!', 'Your feedback has been submitted successfully.', [
      { text: 'OK', onPress: onBack },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate the App</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Star Character Graphic */}
        <View style={styles.graphicContainer}>
          <Star size={64} color="#f59e0b" fill="#f59e0b" />
        </View>

        {/* Heading */}
        <Text style={styles.mainHeading}>We Value Your Feedback!</Text>
        <Text style={styles.subHeading}>
          Enjoying CallMind Telecaller? Please take a moment to rate us.
        </Text>

        {/* 5-Star Rating Selector */}
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((starNum) => (
            <TouchableOpacity key={starNum} onPress={() => setRating(starNum)} activeOpacity={0.8}>
              <Star
                size={36}
                color={starNum <= rating ? '#f59e0b' : '#cbd5e1'}
                fill={starNum <= rating ? '#f59e0b' : 'none'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>Great</Text>
        <Text style={styles.ratingHint}>Tap a star to rate</Text>

        {/* Feedback Textarea Box */}
        <View style={styles.textareaContainer}>
          <Text style={styles.textareaLabel}>Tell us what you like (Optional)</Text>
          <TextInput
            style={styles.textarea}
            multiline
            numberOfLines={4}
            maxLength={200}
            value={feedbackText}
            onChangeText={setFeedbackText}
            placeholder="Write your feedback..."
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.charCount}>{feedbackText.length}/200</Text>
        </View>
      </ScrollView>

      {/* Footer Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85} accessibilityLabel="Submit Rating" accessibilityRole="button">
          <Text style={styles.submitBtnText}>Submit Rating</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.maybeLaterBtn} onPress={onBack} activeOpacity={0.7} accessibilityLabel="Maybe Later" accessibilityRole="button">
          <Text style={styles.maybeLaterText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingBottom: 20,
  },
  graphicContainer: {
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGraphicEmoji: {
    fontSize: 72,
  },
  mainHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: 24,
  },
  starRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  ratingHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 24,
  },
  textareaContainer: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textareaLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  textarea: {
    fontSize: 14,
    color: '#0f172a',
    height: 90,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  maybeLaterBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  maybeLaterText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
});
