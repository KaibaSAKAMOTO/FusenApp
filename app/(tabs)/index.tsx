import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const moveFusenUp = (section: SectionType, index: number) => {
    if (index === 0) return;
    const items = [...data[section]];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    
    const newData = {
      ...data,
      [section]: items,
    };
    saveData(newData);
  };

  const moveFusenDown = (section: SectionType, index: number) => {
    const items = [...data[section]];
    if (index === items.length - 1) return;
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    
    const newData = {
      ...data,
      [section]: items,
    };
    saveData(newData);
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
      
      {data[section].map((fusen, index) => (
        <View key={fusen.id} style={[styles.fusenItem, { backgroundColor: colorMap[fusen.color] }]}>
          <View style={styles.fusenLeft}>
            <View style={styles.moveButtons}>
              <TouchableOpacity 
                style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]} 
                onPress={() => moveFusenUp(section, index)}
                disabled={index === 0}
              >
                <Text style={styles.moveButtonText}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.moveButton, index === data[section].length - 1 && styles.moveButtonDisabled]} 
                onPress={() => moveFusenDown(section, index)}
                disabled={index === data[section].length - 1}
              >
                <Text style={styles.moveButtonText}>▼</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fusenText}>{fusen.text}</Text>
          </View>
          <View style={styles.fusenButtons}>
            <TouchableOpacity 
              style={styles.completeButton} 
              onPress={() => completeFusen(section, fusen.id)}
            >
              <Text style={styles.buttonText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => deleteFusen(section, fusen.id)}
            >
              <Text style={styles.buttonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

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
                <Text style={[styles.fusenText, { textDecorationLine: 'line-through', flex: 1 }]}>{fusen.text}</Text>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteFusen('completed', fusen.id)}>
                  <Text style={styles.buttonText}>🗑️</Text>
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
  fusenLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moveButtons: {
    flexDirection: 'column',
    gap: 5,
  },
  moveButton: {
    backgroundColor: '#666',
    width: 24,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  moveButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
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