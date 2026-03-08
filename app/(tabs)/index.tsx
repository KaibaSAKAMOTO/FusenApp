import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Fusen {
  id: string;
  text: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'orange';
  completed: boolean;
}

interface FusenData {
  today: Fusen[];
  week: Fusen[];
  month: Fusen[];
  year: Fusen[];
  completed: Fusen[];
}

type SectionType = 'today' | 'week' | 'month' | 'year';

function SortableFusen({ fusen, onComplete, onDelete }: { fusen: Fusen; onComplete: () => void; onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: fusen.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colorMap = {
    yellow: '#FFF59D',
    pink: '#F8BBD0',
    blue: '#BBDEFB',
    green: '#C8E6C9',
    orange: '#FFCCBC',
  };

  return (
    <View ref={setNodeRef} style={[styles.fusenItem, { backgroundColor: colorMap[fusen.color] }, style]} {...attributes} {...listeners}>
      <Text style={styles.fusenText}>{fusen.text}</Text>
      <View style={styles.fusenButtons}>
        <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
          <Text style={styles.buttonText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.buttonText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [data, setData] = useState<FusenData>({
    today: [],
    week: [],
    month: [],
    year: [],
    completed: [],
  });
  const [showAddForm, setShowAddForm] = useState<SectionType | null>(null);
  const [newFusenText, setNewFusenText] = useState('');
  const [newFusenColor, setNewFusenColor] = useState<'yellow' | 'pink' | 'blue' | 'green' | 'orange'>('yellow');
  const [showCompleted, setShowCompleted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('fusenData');
      if (saved) {
        setData(JSON.parse(saved));
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  };

  const saveData = async (newData: FusenData) => {
    try {
      await AsyncStorage.setItem('fusenData', JSON.stringify(newData));
      setData(newData);
    } catch (error) {
      console.error('データ保存エラー:', error);
    }
  };

  const addFusen = (section: SectionType) => {
    if (!newFusenText.trim()) {
      if (Platform.OS === 'web') {
        alert('テキストを入力してください');
      }
      return;
    }

    const newFusen: Fusen = {
      id: Date.now().toString(),
      text: newFusenText,
      color: newFusenColor,
      completed: false,
    };

    const newData = {
      ...data,
      [section]: [...data[section], newFusen],
    };

    saveData(newData);
    setNewFusenText('');
    setNewFusenColor('yellow');
    setShowAddForm(null);
  };

  const completeFusen = (section: SectionType, id: string) => {
    const fusen = data[section].find(f => f.id === id);
    if (!fusen) return;

    const newData = {
      ...data,
      [section]: data[section].filter(f => f.id !== id),
      completed: [...data.completed, { ...fusen, completed: true }],
    };

    saveData(newData);
  };

  const deleteFusen = (section: SectionType | 'completed', id: string) => {
    const newData = {
      ...data,
      [section]: data[section].filter(f => f.id !== id),
    };

    saveData(newData);
  };

  const handleDragEnd = (event: DragEndEvent, section: SectionType) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = data[section];
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      const newData = {
        ...data,
        [section]: arrayMove(items, oldIndex, newIndex),
      };

      saveData(newData);
    }
  };

  const getSectionTitle = (section: SectionType) => {
    switch (section) {
      case 'today': return '今日';
      case 'week': return '今週';
      case 'month': return '今月';
      case 'year': return '今年';
    }
  };

  const colorOptions: Array<'yellow' | 'pink' | 'blue' | 'green' | 'orange'> = ['yellow', 'pink', 'blue', 'green', 'orange'];
  const colorLabels = {
    yellow: '黄',
    pink: 'ピンク',
    blue: '青',
    green: '緑',
    orange: 'オレンジ',
  };
  const colorMap = {
    yellow: '#FFF59D',
    pink: '#F8BBD0',
    blue: '#BBDEFB',
    green: '#C8E6C9',
    orange: '#FFCCBC',
  };

  const renderSection = (section: SectionType) => (
    <View key={section} style={styles.section}>
      <Text style={styles.sectionTitle}>{getSectionTitle(section)}</Text>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => handleDragEnd(event, section)}
      >
        <SortableContext
          items={data[section].map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {data[section].map(fusen => (
            <SortableFusen
              key={fusen.id}
              fusen={fusen}
              onComplete={() => completeFusen(section, fusen.id)}
              onDelete={() => deleteFusen(section, fusen.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {showAddForm === section ? (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="やること"
            value={newFusenText}
            onChangeText={setNewFusenText}
          />
          <View style={styles.colorOptions}>
            {colorOptions.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: colorMap[color] },
                  newFusenColor === color && styles.colorOptionSelected
                ]}
                onPress={() => setNewFusenColor(color)}
              >
                <Text style={styles.colorLabel}>{colorLabels[color]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddForm(null)}>
              <Text style={styles.buttonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={() => addFusen(section)}>
              <Text style={styles.buttonText}>追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(section)}>
          <Text style={styles.addButtonText}>+ 付箋を追加</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>付箋アプリ</Text>

      <TouchableOpacity style={styles.completedButton} onPress={() => setShowCompleted(!showCompleted)}>
        <Text style={styles.completedButtonText}>
          {showCompleted ? '未完了を表示' : `完了リスト (${data.completed.length})`}
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        {showCompleted ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>完了リスト</Text>
            {data.completed.map(fusen => (
              <View key={fusen.id} style={[styles.fusenItem, { backgroundColor: colorMap[fusen.color], opacity: 0.6 }]}>
                <Text style={[styles.fusenText, { textDecorationLine: 'line-through' }]}>{fusen.text}</Text>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteFusen('completed', fusen.id)}>
                  <Text style={styles.buttonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <>
            {renderSection('today')}
            {renderSection('week')}
            {renderSection('month')}
            {renderSection('year')}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 40,
  },
  completedButton: {
    backgroundColor: '#9E9E9E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  completedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  fusenItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  fusenText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  fusenButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addForm: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 16,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  colorOption: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#333',
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#999',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
});