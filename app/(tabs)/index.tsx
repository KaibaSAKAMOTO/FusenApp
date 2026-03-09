import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
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
  routine: Fusen[];
  today: Fusen[];
  week: Fusen[];
  month: Fusen[];
  year: Fusen[];
  completed: Fusen[];
}

type SectionType = 'routine' | 'today' | 'week' | 'month' | 'year';

function SortableFusen({ 
  fusen, 
  section,
  onComplete, 
  onDelete,
  onCopy,
}: { 
  fusen: Fusen; 
  section: SectionType | 'completed';
  onComplete?: () => void; 
  onDelete: () => void;
  onCopy?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fusen.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colorMap = {
    yellow: '#FFF59D',
    pink: '#F8BBD0',
    blue: '#BBDEFB',
    green: '#C8E6C9',
    orange: '#FFCCBC',
  };

  return (
    <View 
      ref={setNodeRef} 
      style={[
        styles.fusenItem, 
        { backgroundColor: colorMap[fusen.color] },
        section === 'completed' && { opacity: 0.6 },
        style
      ]} 
      {...attributes} 
      {...listeners}
    >
      <Text style={[
        styles.fusenText,
        section === 'completed' && { textDecorationLine: 'line-through' }
      ]}>
        {fusen.text}
      </Text>
      <View style={styles.fusenButtons}>
        {section === 'routine' && onCopy && (
          <TouchableOpacity style={styles.copyButton} onPress={onCopy}>
            <Text style={styles.buttonText}>📋</Text>
          </TouchableOpacity>
        )}
        {onComplete && (
          <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
            <Text style={styles.buttonText}>✓</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.buttonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [data, setData] = useState<FusenData>({
    routine: [],
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
  const [activeFusen, setActiveFusen] = useState<Fusen | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('fusenData');
      if (saved) {
        const parsedData = JSON.parse(saved);
        // 古いデータにroutineがない場合は追加
        if (!parsedData.routine) {
          parsedData.routine = [];
        }
        setData(parsedData);
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

  const copyFusen = (fusen: Fusen) => {
    const newFusen: Fusen = {
      id: Date.now().toString(),
      text: fusen.text,
      color: fusen.color,
      completed: false,
    };

    const newData = {
      ...data,
      routine: [...data.routine, newFusen],
    };

    saveData(newData);
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

  const restoreFusen = (id: string) => {
    const fusen = data.completed.find(f => f.id === id);
    if (!fusen) return;

    const newData = {
      ...data,
      completed: data.completed.filter(f => f.id !== id),
      routine: [...data.routine, { ...fusen, completed: false }],
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const allSections: Array<SectionType | 'completed'> = ['routine', 'today', 'week', 'month', 'year', 'completed'];
    
    for (const section of allSections) {
      const fusen = data[section].find(f => f.id === active.id);
      if (fusen) {
        setActiveFusen(fusen);
        break;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveFusen(null);
    const { active, over } = event;

    if (!over) return;

    // どのセクションから来たか、どのセクションへ行くかを判定
    let fromSection: SectionType | 'completed' | null = null;
    let toSection: SectionType | 'completed' | null = null;

    const allSections: Array<SectionType | 'completed'> = ['routine', 'today', 'week', 'month', 'year', 'completed'];

    // activeがどのセクションにあるか
    for (const section of allSections) {
      if (data[section].find(f => f.id === active.id)) {
        fromSection = section;
        break;
      }
    }

    // overがどのセクションにあるか
    for (const section of allSections) {
      if (data[section].find(f => f.id === over.id) || over.id === section) {
        toSection = section;
        break;
      }
    }

    if (!fromSection) return;

    // 完了リストへはドラッグできない
    if (toSection === 'completed') return;

    // セクション間の移動
    if (fromSection !== toSection && toSection) {
      const fusen = data[fromSection].find(f => f.id === active.id);
      if (!fusen) return;

      const newData = {
        ...data,
        [fromSection]: data[fromSection].filter(f => f.id !== active.id),
        [toSection]: [...data[toSection], fusen],
      };

      saveData(newData);
    }
    // 同じセクション内での並び替え
    else if (active.id !== over.id && fromSection === toSection) {
      const items = data[fromSection];
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      const newData = {
        ...data,
        [fromSection]: arrayMove(items, oldIndex, newIndex),
      };

      saveData(newData);
    }
  };

  const getSectionTitle = (section: SectionType) => {
    switch (section) {
      case 'routine': return 'ルーティン';
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
      
      <SortableContext
        items={data[section].map(f => f.id)}
        strategy={verticalListSortingStrategy}
        id={section}
      >
        {data[section].map(fusen => (
          <SortableFusen
            key={fusen.id}
            fusen={fusen}
            section={section}
            onComplete={section !== 'routine' ? () => completeFusen(section, fusen.id) : undefined}
            onDelete={() => deleteFusen(section, fusen.id)}
            onCopy={section === 'routine' ? () => copyFusen(fusen) : undefined}
          />
        ))}
      </SortableContext>

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

  const allItems = [
    ...data.routine.map(f => f.id),
    ...data.today.map(f => f.id),
    ...data.week.map(f => f.id),
    ...data.month.map(f => f.id),
    ...data.year.map(f => f.id),
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                  <Text style={[styles.fusenText, { textDecorationLine: 'line-through', flex: 1 }]}>{fusen.text}</Text>
                  <View style={styles.fusenButtons}>
                    <TouchableOpacity style={styles.restoreButton} onPress={() => restoreFusen(fusen.id)}>
                      <Text style={styles.buttonText}>↩️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteFusen('completed', fusen.id)}>
                      <Text style={styles.buttonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <SortableContext items={allItems} strategy={verticalListSortingStrategy}>
              {renderSection('routine')}
              {renderSection('today')}
              {renderSection('week')}
              {renderSection('month')}
              {renderSection('year')}
            </SortableContext>
          )}
        </ScrollView>

        <DragOverlay>
          {activeFusen ? (
            <View style={[styles.fusenItem, { backgroundColor: colorMap[activeFusen.color] }]}>
              <Text style={styles.fusenText}>{activeFusen.text}</Text>
            </View>
          ) : null}
        </DragOverlay>
      </View>
    </DndContext>
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
  copyButton: {
    backgroundColor: '#9C27B0',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreButton: {
    backgroundColor: '#FF9800',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    width: 36,
    height: 36,
    borderRadius: 18,
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