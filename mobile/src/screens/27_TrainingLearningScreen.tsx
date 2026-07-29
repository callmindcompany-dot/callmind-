import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Search, Play, BookOpen, Award, Headphones, ChevronRight, GraduationCap } from 'lucide-react-native';

interface TrainingLearningProps {
  onBack: () => void;
}

export const TrainingLearningScreen: React.FC<TrainingLearningProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('All Courses');

  const recommendedCourses = [
    {
      id: '1',
      title: 'Handling Objections Like a Pro',
      duration: '18 min',
      level: 'Beginner',
      IconComponent: BookOpen,
      iconColor: '#16a34a',
      iconBg: '#dcfce7',
    },
    {
      id: '2',
      title: 'Product Knowledge Mastery',
      duration: '22 min',
      level: 'Intermediate',
      IconComponent: Award,
      iconColor: '#d97706',
      iconBg: '#fef3c7',
    },
    {
      id: '3',
      title: 'Call Opening Best Practices',
      duration: '15 min',
      level: 'Beginner',
      IconComponent: Headphones,
      iconColor: '#8b5cf6',
      iconBg: '#f3e8ff',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Training & Learning</Text>
        <TouchableOpacity style={styles.searchBtn} accessibilityLabel="Search Modules" accessibilityRole="button">
          <Search size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Banner Card */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Keep Learning,{'\n'}Keep Growing!</Text>
            <Text style={styles.heroSubtitle}>Enhance your skills and become a top performer.</Text>
          </View>
          <View style={styles.heroGraphic}>
            <GraduationCap size={36} color="#2563eb" />
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          {['All Courses', 'Product Knowledge', 'Soft Skills'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Learning Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          <TouchableOpacity style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>

        <View style={styles.continueCard}>
          <View style={styles.thumbnailBox}>
            <View style={styles.playIconCircle}>
              <Play size={18} color="#2563eb" />
            </View>
          </View>
          <View style={styles.continueInfo}>
            <Text style={styles.courseTitle}>Effective Communication for Telecallers</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '60%' }]} />
              </View>
              <Text style={styles.progressPercent}>60%</Text>
            </View>
            <Text style={styles.timeLeft}>25 min left</Text>
          </View>
        </View>

        {/* Recommended for You Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <TouchableOpacity style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>

        <View style={styles.recommendedList}>
          {recommendedCourses.map((course) => {
            const Icon = course.IconComponent;
            return (
              <TouchableOpacity key={course.id} style={styles.courseCard} activeOpacity={0.8}>
                <View style={[styles.courseIconBox, { backgroundColor: course.iconBg }]}>
                  <Icon size={20} color={course.iconColor} />
                </View>
                <View style={styles.courseDetails}>
                  <Text style={styles.recommendedTitle}>{course.title}</Text>
                  <Text style={styles.courseMeta}>{course.duration} • {course.level}</Text>
                </View>
                <View style={styles.playBtnCircle}>
                  <Play size={14} color="#2563eb" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroBanner: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 20,
    alignItems: 'center',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1d4ed8',
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
    marginTop: 6,
  },
  heroGraphic: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 42,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tabChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '700',
  },
  continueCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnailBox: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  continueInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  timeLeft: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  recommendedList: {
    gap: 12,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
  },
  courseIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseDetails: {
    flex: 1,
  },
  recommendedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  courseMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  playBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
