import { useState } from 'react';

/**
 * ナンプレ自動解答機のメインコンポーネント
 * 数独パズルを自動で解く機能を提供する
 */
function App() {
  // 9x9のマス目のインデックス配列（行、列、ブロックの情報を含む）
  const indexArray = Array.from({ length: 9 * 9 }, (_, index) => ({ 
    rowIndex: Math.floor(index / 9), 
    colIndex: index % 9, 
    blockIndex: Math.floor(index / 27) * 3 + Math.floor((index % 9) / 3) 
  }));

  // ナンプレの盤面（9x9の配列、空文字は未入力）
  const [numberArray, setNumberArray] = useState(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => '')));
  
  // 各マスの候補数字（9x9x9の配列、各マスに1-9の候補を保持）
  const [candidateArray, setCandidateArray] = useState(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ['1', '2', '3', '4', '5', '6', '7', '8', '9'])));
  
  // 解答処理中かどうかのフラグ
  const [isSolving, setIsSolving] = useState(false);
  
  // 候補数字の表示/非表示フラグ
  const [isCandidateVisible, setIsCandidateVisible] = useState(false);
  
  // 現在フォーカスされているマスの位置
  const [focusIndex, setFocusIndex] = useState({ rowIndex: -1, colIndex: -1 });
  
  // 各マスの文字色（入力済みは黒、未入力は赤）
  const [colorArray, setColorArray] = useState(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 'text-red-600')));
  
  // 仮定法の使用フラグ
  const [assumeFlag, setAssumeFlag] = useState(false);

  /**
   * 配列の深いコピーを作成
   * @param array コピー元の配列
   * @returns コピーされた配列
   */
  const deepCopy: <T>(array: T[]) => T[] = (array) => {
    return JSON.parse(JSON.stringify(array));
  };

  /* 盤面更新用 */

  /**
   * 候補数の初期化
  */
  const initialize = (innerNumberArray: string[][], innerCandidateArray: string[][][]) => {
    // 候補数を初期化
    indexArray.forEach(({ rowIndex, colIndex }) => {
      innerCandidateArray[rowIndex][colIndex] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    });
    // 数字が確定したマスに基づいて候補数を削除
    indexArray.forEach(({ rowIndex, colIndex, blockIndex }) => {
      if (innerNumberArray[rowIndex][colIndex] !== '') {
        updateNumberOnIndex({ rowIndex, colIndex, blockIndex, value: innerNumberArray[rowIndex][colIndex], innerNumberArray, innerCandidateArray });
      }
    });
  };

  /**
   * マスの数字が確定したとき、
   * 1. そのマスに数字を表示
   * 2. そのマスの候補数を全て削除
   * 3. 同一行・列・ブロック内の候補数からその数字を削除
   * @param rowIndex 行番号
   * @param colIndex 列番号
   * @param value 確定した数字
   */
  const updateNumberOnIndex = ({
    rowIndex, colIndex, blockIndex, value, innerNumberArray, innerCandidateArray,
  }: {
    rowIndex: number, colIndex: number, blockIndex: number, value: string, innerNumberArray: string[][], innerCandidateArray: string[][][],
  }) => {
    // そのマスに数字を表示
    innerNumberArray[rowIndex][colIndex] = value;
    // そのマスの候補数を全て削除
    innerCandidateArray[rowIndex][colIndex] = [];
    // 同一行・列・ブロック内の候補数からその数字を削除
    indexArray.forEach(({ rowIndex: candRowIndex, colIndex: candColIndex, blockIndex: candBlockIndex }) => {
      if (candRowIndex === rowIndex || candColIndex === colIndex || candBlockIndex === blockIndex) {
        innerCandidateArray[candRowIndex][candColIndex] = innerCandidateArray[candRowIndex][candColIndex].filter((c) => c !== value);
      }
    });
  };

  /**
   * 複数のマスが共通の候補数を持つとき、
   * 1. 必要ならindicesで指定されたマスの候補数からvaluesに含まれていない数字を削除
   * 2. 同一グループ内の候補数からvaluesに含まれる数字を削除
   * @param indices 共通の候補数を持つマスのインデックス
   * @param values 共通の候補数
   * @param updateGroup 更新対象のグループ（行・列・ブロック）
   * @param deleteOtherCands 共通マスの候補数からvaluesに含まれていない数字を削除するかどうか
   */
  const updateCandidatesOnGroup = ({
    indices, values, updateGroup, deleteOtherCands, innerCandidateArray,
  }: {
    indices: { rowIndex: number, colIndex: number, blockIndex: number }[], values: string[], updateGroup: 'row' | 'column' | 'block', deleteOtherCands: boolean, innerCandidateArray: string[][][],
  }) => {
    // 必要ならindicesで指定されたマスの候補数からvaluesに含まれていない数字を削除
    if (deleteOtherCands) {
      indices.forEach(({ rowIndex, colIndex }) => {
        innerCandidateArray[rowIndex][colIndex] = innerCandidateArray[rowIndex][colIndex].filter((c) => values.includes(c));
      });
    }
    // 同一グループ内の候補数からvaluesに含まれる数字を削除
    switch (updateGroup) {
      case 'row':
        const baseRowIndex = indices[0].rowIndex;
        indexArray.forEach(({ rowIndex, colIndex }) => {
          if (rowIndex === baseRowIndex && !indices.some(({ rowIndex: candRowIndex, colIndex: candColIndex }) => rowIndex === candRowIndex && colIndex === candColIndex)) {
            innerCandidateArray[rowIndex][colIndex] = innerCandidateArray[rowIndex][colIndex].filter((c) => !values.includes(c));
          }
        });
        break;
      case 'column':
        const baseColIndex = indices[0].colIndex;
        indexArray.forEach(({ rowIndex, colIndex }) => {
          if (colIndex === baseColIndex && !indices.some(({ rowIndex: candRowIndex, colIndex: candColIndex }) => rowIndex === candRowIndex && colIndex === candColIndex)) {
            innerCandidateArray[rowIndex][colIndex] = innerCandidateArray[rowIndex][colIndex].filter((c) => !values.includes(c));
          }
        });
        break;
      case 'block':
        const baseBlockIndex = indices[0].blockIndex;
        indexArray.forEach(({ rowIndex, colIndex, blockIndex }) => {
          if (blockIndex === baseBlockIndex && !indices.some(({ rowIndex: candRowIndex, colIndex: candColIndex }) => rowIndex === candRowIndex && colIndex === candColIndex)) {
            innerCandidateArray[rowIndex][colIndex] = innerCandidateArray[rowIndex][colIndex].filter((c) => !values.includes(c));
          }
        });
        break;
    }
  };

  /* 解答アルゴリズム */

  /**
   * 組み合わせを生成
   * @param elements 要素
   * @param length 組み合わせの長さ
   * @returns 組み合わせ
   */
  const combination: <T>(elements: T[], length: number) => T[][] = (elements, length) => {
    const answer = [];
    if (length === 1) {
      for (let i = 0; i < elements.length; i++) {
        answer[i] = [elements[i]];
      }
    } else {
      const part = elements.slice(0);
      for (let i = 0; i < elements.length; i++) {
        const firstEl = part.splice(0, 1);
        const row = combination(part, length - 1);
        for (let i = 0; i < row.length; i++) {
          answer.push([firstEl[0]].concat(row[i]));
        }
      }
    }
    return answer;
  };

  /**
   * 候補数が1つだけのマスを確定
   * @param innerNumberArray 現在の盤面
   * @param innerCandidateArray 現在の候補数
   */
  const algorithm1 = ({ innerNumberArray, innerCandidateArray }: { innerNumberArray: string[][], innerCandidateArray: string[][][] }) => {
    indexArray.forEach(({ rowIndex, colIndex, blockIndex }) => {
      if (innerNumberArray[rowIndex][colIndex] !== '') {
        return;
      }
      const candidate = innerCandidateArray[rowIndex][colIndex];
      if (candidate.length === 1) {
        updateNumberOnIndex({ rowIndex, colIndex, blockIndex, value: candidate[0], innerNumberArray, innerCandidateArray });
      }
    });
  };

  /**
   * 候補数が同一行・列・ブロック内で唯一かチェック
   * @param checkGroup チェックするグループ
   * @param innerNumberArray 現在の盤面
   * @param innerCandidateArray 現在の候補数
   */
  const algorithm2 = ({ checkGroup, innerNumberArray, innerCandidateArray }: { checkGroup: 'row' | 'column' | 'block', innerNumberArray: string[][], innerCandidateArray: string[][][] }) => {
    switch (checkGroup) {
      case 'row':
        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((baseRowIndex) => {
          const sameGroup = indexArray.filter(({ rowIndex }) => baseRowIndex === rowIndex);
          sameGroup.forEach(({ rowIndex, colIndex, blockIndex }) => {
            innerCandidateArray[rowIndex][colIndex].forEach((c) => {
              if (sameGroup.every(({ rowIndex: candRowIndex, colIndex: candColIndex }) => candColIndex === colIndex || !innerCandidateArray[candRowIndex][candColIndex].includes(c))) {
                updateNumberOnIndex({ rowIndex, colIndex, blockIndex, value: c, innerNumberArray, innerCandidateArray });
              }
            });
          });
        });
        break;
      case 'column':
        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((baseColIndex) => {
          const sameGroup = indexArray.filter(({ colIndex }) => baseColIndex === colIndex);
          sameGroup.forEach(({ rowIndex, colIndex, blockIndex }) => {
            innerCandidateArray[rowIndex][colIndex].forEach((c) => {
              if (sameGroup.every(({ rowIndex: candRowIndex, colIndex: candColIndex }) => candRowIndex === rowIndex || !innerCandidateArray[candRowIndex][candColIndex].includes(c))) {
                updateNumberOnIndex({ rowIndex, colIndex, blockIndex, value: c, innerNumberArray, innerCandidateArray });
              }
            });
          });
        });
        break;
      case 'block':
        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((baseBlockIndex) => {
          const sameGroup = indexArray.filter(({ blockIndex }) => baseBlockIndex === blockIndex);
          sameGroup.forEach(({ rowIndex, colIndex, blockIndex }) => {
            innerCandidateArray[rowIndex][colIndex].forEach((c) => {
              if (sameGroup.every(({ rowIndex: candRowIndex, colIndex: candColIndex }) => (candRowIndex === rowIndex && candColIndex === colIndex) || !innerCandidateArray[candRowIndex][candColIndex].includes(c))) {
                updateNumberOnIndex({ rowIndex, colIndex, blockIndex, value: c, innerNumberArray, innerCandidateArray });
              }
            });
          });
        });
        break;
    }
  };

  /**
   * 行・列内で候補数が同一ブロックに属しているか、またはブロック内で候補数が同一行・列に属しているかチェック
   * @param checkGroup チェックするグループ
   * @param innerCandidateArray 現在の候補数
   */
  const algorithm3 = ({ checkGroup, innerCandidateArray }: { checkGroup: 'row' | 'column' | 'block', innerCandidateArray: string[][][] }) => {
    switch (checkGroup) {
      case 'row':
        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((rowIndex) => {
          const sameGroup = indexArray.filter(({ rowIndex: candRowIndex }) => rowIndex === candRowIndex);
          ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach((c) => {
            const sameCandGroup = sameGroup.filter(({ rowIndex: candRowIndex, colIndex: candColIndex }) => innerCandidateArray[candRowIndex][candColIndex].includes(c));
            if (sameCandGroup.length <= 1) {
              return;
            }
            const baseBlockIndex = sameCandGroup[0].blockIndex;
            if (sameCandGroup.every(({ blockIndex: candBlockIndex }) => candBlockIndex === baseBlockIndex)) {
              updateCandidatesOnGroup({ indices: sameCandGroup, values: [c], updateGroup: 'block', deleteOtherCands: false, innerCandidateArray });
            }
          });
        });
        break;
      case 'column':
        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((colIndex) => {
          const sameGroup = indexArray.filter(({ colIndex: candColIndex }) => colIndex === candColIndex);
          ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach((c) => {
            const sameCandGroup = sameGroup.filter(({ rowIndex: candRowIndex, colIndex: candColIndex }) => innerCandidateArray[candRowIndex][candColIndex].includes(c));
            if (sameCandGroup.length <= 1) {
              return;
            }
            const baseBlockIndex = sameCandGroup[0].blockIndex;
            if (sameCandGroup.every(({ blockIndex: candBlockIndex }) => candBlockIndex === baseBlockIndex)) {
              updateCandidatesOnGroup({ indices: sameCandGroup, values: [c], updateGroup: 'block', deleteOtherCands: false, innerCandidateArray });
            }
          });
        });
        break;
      case 'block':
        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((blockIndex) => {
          const sameGroup = indexArray.filter(({ blockIndex: candBlockIndex }) => blockIndex === candBlockIndex);
          ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach((c) => {
            const sameCandGroup = sameGroup.filter(({ rowIndex: candRowIndex, colIndex: candColIndex }) => innerCandidateArray[candRowIndex][candColIndex].includes(c));
            if (sameCandGroup.length <= 1) {
              return;
            }
            const baseRowIndex = sameCandGroup[0].rowIndex;
            const baseColIndex = sameCandGroup[0].colIndex;
            if (sameCandGroup.every(({ rowIndex: candRowIndex }) => candRowIndex === baseRowIndex)) {
              updateCandidatesOnGroup({ indices: sameCandGroup, values: [c], updateGroup: 'row', deleteOtherCands: false, innerCandidateArray });
            } else if (sameCandGroup.every(({ colIndex: candColIndex }) => candColIndex === baseColIndex)) {
              updateCandidatesOnGroup({ indices: sameCandGroup, values: [c], updateGroup: 'column', deleteOtherCands: false, innerCandidateArray });
            }
          });
        });
        break;
    }
  };

  /**
   * 行・列・ブロック内で候補数のペアが存在するかチェック
   * @param checkGroup チェックするグループ
   * @param innerCandidateArray 現在の候補数
   */
  const algorithm4 = ({ checkGroup, innerCandidateArray }: { checkGroup: 'row' | 'column' | 'block', innerCandidateArray: string[][][] }) => {
    switch (checkGroup) {
      case 'row':
        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((baseRowIndex) => {
          const sameEmptyGroup = indexArray.filter(({ rowIndex, colIndex }) => rowIndex === baseRowIndex && innerCandidateArray[rowIndex][colIndex].length >= 2);
          for (let length = 2; length <= sameEmptyGroup.length; length++) {
            const combs = combination(sameEmptyGroup, length);
            combs.forEach((comb) => {
              const candSet = new Set<string>();
              comb.forEach(({ rowIndex, colIndex }) => {
                innerCandidateArray[rowIndex][colIndex].forEach((cand) => {
                  candSet.add(cand);
                });
              });
              if (candSet.size === length) {
                const candArray = Array.from(candSet);
                updateCandidatesOnGroup({ indices: comb, values: candArray, updateGroup: 'row', deleteOtherCands: true, innerCandidateArray });
              }
            });
          }
        });
        break;
      case 'column':
        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((baseColIndex) => {
          const sameEmptyGroup = indexArray.filter(({ rowIndex, colIndex }) => colIndex === baseColIndex && innerCandidateArray[rowIndex][colIndex].length >= 2);
          for (let length = 2; length <= sameEmptyGroup.length; length++) {
            const combs = combination(sameEmptyGroup, length);
            combs.forEach((comb) => {
              const candSet = new Set<string>();
              comb.forEach(({ rowIndex, colIndex }) => {
                innerCandidateArray[rowIndex][colIndex].forEach((cand) => {
                  candSet.add(cand);
                });
              });
              if (candSet.size === length) {
                const candArray = Array.from(candSet);
                updateCandidatesOnGroup({ indices: comb, values: candArray, updateGroup: 'column', deleteOtherCands: true, innerCandidateArray });
              }
            });
          }
        });
        break;
      case 'block':
        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((baseBlockIndex) => {
          const sameEmptyGroup = indexArray.filter(({ rowIndex, colIndex, blockIndex }) => blockIndex === baseBlockIndex && innerCandidateArray[rowIndex][colIndex].length >= 2);
          for (let length = 2; length <= sameEmptyGroup.length; length++) {
            const combs = combination(sameEmptyGroup, length);
            combs.forEach((comb) => {
              const candSet = new Set<string>();
              comb.forEach(({ rowIndex, colIndex }) => {
                innerCandidateArray[rowIndex][colIndex].forEach((cand) => {
                  candSet.add(cand);
                });
              });
              if (candSet.size === length) {
                const candArray = Array.from(candSet);
                updateCandidatesOnGroup({ indices: comb, values: candArray, updateGroup: 'block', deleteOtherCands: true, innerCandidateArray });
              }
            });
          }
        });
        break;
    }
  };

  /**
   * 仮定法
   * @param stack 仮定法スタック
   * @param innerNumberArray 現在の盤面
   * @param innerCandidateArray 現在の候補数
   * @returns 仮定法が成功したかどうか
   */
  const algorithm5 = ({ stack, innerNumberArray, innerCandidateArray }: { stack: { currentNumberArray: string[][], currentCandidateArray: string[][][], branchs: string[] }[], innerNumberArray: string[][], innerCandidateArray: string[][][] }) => {
    // 候補数が最小のマスを選択
    const shortestCandIndex = indexArray.reduce((shortestIndex, { rowIndex, colIndex }) => {
      if (innerNumberArray[rowIndex][colIndex] === '') {
        if (innerNumberArray[shortestIndex.rowIndex][shortestIndex.colIndex] === '') {
          return { rowIndex, colIndex };
        }
        if (innerCandidateArray[rowIndex][colIndex].length < innerCandidateArray[shortestIndex.rowIndex][shortestIndex.colIndex].length) {
          return { rowIndex, colIndex };
        }
      }
      return shortestIndex;
    }, { rowIndex: 0, colIndex: 0 });
    const rowIndex = shortestCandIndex.rowIndex;
    const colIndex = shortestCandIndex.colIndex;
    const blockIndex = Math.floor(rowIndex / 3) * 3 + Math.floor(colIndex / 3);
    const cand = innerCandidateArray[rowIndex][colIndex];
    if (cand.length >= 1) {
      // 仮定法スタックに追加
      stack.push({ currentNumberArray: deepCopy(innerNumberArray), currentCandidateArray: deepCopy(innerCandidateArray), branchs: [...cand] });
    }
    // 仮定法スタックが空の場合は問題に矛盾があると判断
    if (stack.length === 0) {
      return false;
    }
    // 仮定法スタックから復元
    const stackItem = stack.pop()!;
    indexArray.forEach(({ rowIndex, colIndex }) => {
      innerNumberArray[rowIndex][colIndex] = stackItem.currentNumberArray[rowIndex][colIndex];
      innerCandidateArray[rowIndex][colIndex] = stackItem.currentCandidateArray[rowIndex][colIndex];
    });
    const value = stackItem.branchs.pop()!;
    // 枝が残っている場合は仮定法スタックに戻す
    if (stackItem.branchs.length > 0) {
      stack.push(stackItem);
    }
    // 仮定法開始
    updateNumberOnIndex({ rowIndex, colIndex, blockIndex, value, innerNumberArray, innerCandidateArray });
    return true;
  };

  /**
   * ナンプレの自動解答を実行するメイン関数
   * 複数のアルゴリズムを順次実行して解答を試みる
   * @returns 'success' | 'failure' | 'continue' 解答結果
   */
  const solve: () => 'success' | 'failure' | 'continue' = () => {
    // 内部で使用する配列の深いコピーを作成
    const innerNumberArray = deepCopy(numberArray);
    const innerCandidateArray = deepCopy(candidateArray);
    const stack: { currentNumberArray: string[][], currentCandidateArray: string[][][], branchs: string[] }[] = [];
    
    // 現在の盤面を内部配列にコピー
    indexArray.forEach(({ rowIndex, colIndex }) => {
      innerNumberArray[rowIndex][colIndex] = numberArray[rowIndex][colIndex];
    });
    
    // 候補数字を初期化
    initialize(innerNumberArray, innerCandidateArray);

    let oldCandidateArray = deepCopy(innerCandidateArray);
    
    // 解答ループ
    while (true) {
      // 各種アルゴリズムを順次実行
      algorithm1({ innerNumberArray, innerCandidateArray }); // 候補数が1つのマスを確定
      algorithm2({ checkGroup: 'row', innerNumberArray, innerCandidateArray }); // 行での唯一候補チェック
      algorithm2({ checkGroup: 'column', innerNumberArray, innerCandidateArray }); // 列での唯一候補チェック
      algorithm2({ checkGroup: 'block', innerNumberArray, innerCandidateArray }); // ブロックでの唯一候補チェック
      algorithm3({ checkGroup: 'row', innerCandidateArray }); // 行でのブロック制約チェック
      algorithm3({ checkGroup: 'column', innerCandidateArray }); // 列でのブロック制約チェック
      algorithm3({ checkGroup: 'block', innerCandidateArray }); // ブロックでの行・列制約チェック
      algorithm4({ checkGroup: 'row', innerCandidateArray }); // 行でのペア・トリプルチェック
      algorithm4({ checkGroup: 'column', innerCandidateArray }); // 列でのペア・トリプルチェック
      algorithm4({ checkGroup: 'block', innerCandidateArray }); // ブロックでのペア・トリプルチェック

      // 表示を更新
      setNumberArray(deepCopy(innerNumberArray));
      setCandidateArray(deepCopy(innerCandidateArray));

      // 候補数字に変化がない場合
      if (JSON.stringify(oldCandidateArray) === JSON.stringify(innerCandidateArray)) {
        // 全てのマスが埋まっていれば成功
        if (indexArray.every(({ rowIndex, colIndex }) => innerNumberArray[rowIndex][colIndex] !== '')) {
          return 'success';
        }
        // 仮定法を実行
        if (assumeFlag) {
          const result = algorithm5({ stack, innerNumberArray, innerCandidateArray });
          if (!result) {
            return 'failure';
          }
        } else {
          return 'continue';
        }
      }
      oldCandidateArray = deepCopy(innerCandidateArray);
    }
  };

  /* UIイベントハンドラー */

  /**
   * マスの数字が変更されたときの処理
   * @param rowIndex 行番号
   * @param colIndex 列番号
   * @param value 入力された値
   */
  const handleNumberChange = (rowIndex: number, colIndex: number, value: string) => {
    const newValue = value.at(-1) ?? '';
    if (['', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(newValue)) {
      const newNumberArray = deepCopy(numberArray);
      newNumberArray[rowIndex][colIndex] = newValue;
      setNumberArray(newNumberArray);
      const newColorArray = deepCopy(colorArray);
      if (newValue === '') {
        newColorArray[rowIndex][colIndex] = 'text-red-600';
      } else {
        newColorArray[rowIndex][colIndex] = 'text-black';
      }
      setColorArray(newColorArray);
    } else {
      return;
    }
  };

  /**
   * マスにフォーカスが当たったときの処理
   * @param rowIndex 行番号
   * @param colIndex 列番号
   */
  const handleFocusChange = (rowIndex: number, colIndex: number) => {
    setFocusIndex({ rowIndex, colIndex });
  };

  /**
   * キーボード入力時の処理（矢印キーで移動、Enter/Escapeでフォーカス解除）
   * @param e キーボードイベント
   * @param rowIndex 現在の行番号
   * @param colIndex 現在の列番号
   */
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    let newRowIndex = rowIndex;
    let newColIndex = colIndex;

    switch (e.key) {
      case 'ArrowUp':
        newRowIndex = Math.max(0, rowIndex - 1);
        break;
      case 'ArrowDown':
        newRowIndex = Math.min(8, rowIndex + 1);
        break;
      case 'ArrowLeft':
        newColIndex = Math.max(0, colIndex - 1);
        break;
      case 'ArrowRight':
        newColIndex = Math.min(8, colIndex + 1);
        break;
      case 'Enter':
      case 'Escape':
        // EnterキーまたはEscapeキーでフォーカスを外す
        const currentInput = document.querySelector(`input[data-row="${rowIndex}"][data-col="${colIndex}"]`) as HTMLInputElement;
        if (currentInput) {
          currentInput.blur();
        }
        return;
      default:
        return;
    }

    // フォーカスを移動
    if (newRowIndex !== rowIndex || newColIndex !== colIndex) {
      const nextInput = document.querySelector(`input[data-row="${newRowIndex}"][data-col="${newColIndex}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  /**
   * 候補表示ボタンがクリックされたときの処理
   * 候補数字の表示/非表示を切り替える
   */
  const handleCandidateButtonClick = () => {
    const newNumberArray = deepCopy(numberArray);
    const newCandidateArray = deepCopy(candidateArray);
    initialize(newNumberArray, newCandidateArray);
    setCandidateArray(newCandidateArray);
    setIsCandidateVisible(!isCandidateVisible);
  };

  /**
   * 解答ボタンがクリックされたときの処理
   * ナンプレの自動解答を実行する
   */
  const handleSolveButtonClick = () => {
    if (isSolving) {
      setIsSolving(false);
    } else {
      setIsSolving(true);
      const result = solve();
      setTimeout(() => {
        setIsSolving(false);
        switch (result) {
          case 'success':
            break;
          case 'failure':
            alert('解決不可能な問題です');
            break;
          case 'continue':
            alert('通常の解法では解けませんでした。仮定法をONにしてみてください。');
            break;
        }
      }, 50);
    }
  };

  /**
   * 呼び出しボタンがクリックされたときの処理
   * ローカルストレージから保存されたデータを読み込む
   */
  const handleCallButtonClick = () => {
    const json = localStorage.getItem('NumberPlace');
    if (json) {
      if (window.confirm('保存データを呼び出しますか？')) {
        const { numberArray: savedNumberArray } = JSON.parse(json);
        setNumberArray(savedNumberArray);
        const newColorArray = deepCopy(colorArray);
        indexArray.forEach(({ rowIndex, colIndex }) => {
          if (savedNumberArray[rowIndex][colIndex] === '') {
            newColorArray[rowIndex][colIndex] = 'text-red-600';
          } else {
            newColorArray[rowIndex][colIndex] = 'text-black';
          }
        });
        setColorArray(newColorArray);
      }
    } else {
      // alert('保存されたデータがありません');
      // データがない場合はデフォルトの問題を読み込む
      const defaultNumberArray = [
        ['', '4', '6', '', '', '5', '7', '', ''],
        ['', '', '', '9', '', '', '', '', ''],
        ['', '9', '', '', '', '1', '', '', '6'],
        ['', '', '', '', '', '', '9', '', ''],
        ['', '3', '', '', '', '', '', '', ''],
        ['4', '', '', '', '', '', '', '', '8'],
        ['', '8', '', '', '', '', '', '7', ''],
        ['5', '7', '', '3', '', '', '', '8', '2'],
        ['2', '', '', '', '', '', '3', '', ''],
      ];
      setNumberArray(defaultNumberArray);
      const newColorArray = deepCopy(colorArray);
      indexArray.forEach(({ rowIndex, colIndex }) => {
        if (defaultNumberArray[rowIndex][colIndex] === '') {
          newColorArray[rowIndex][colIndex] = 'text-red-600';
        } else {
          newColorArray[rowIndex][colIndex] = 'text-black';
        }
      });
      setColorArray(newColorArray);
    }
  };

  /**
   * 保存ボタンがクリックされたときの処理
   * 現在の盤面をローカルストレージに保存する
   */
  const handleSaveButtonClick = () => {
    if (window.confirm('保存しますか？')) {
      const json = JSON.stringify({ numberArray });
      localStorage.setItem('NumberPlace', json);
      alert('保存しました');
    }
  };

  /**
   * クリアボタンがクリックされたときの処理
   * 盤面を全てクリアする
   */
  const handleClearButtonClick = () => {
    if (window.confirm('クリアしますか？')) {
      setNumberArray(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => '')));
      setColorArray(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 'text-red-600')));
    }
  };

  /**
   * 仮定法切り替えボタンがクリックされたときの処理
   * 仮定法のON/OFFを切り替える
   */
  const handleAssumeFlagChange = () => {
    setAssumeFlag(!assumeFlag);
  };

  /* UIレンダリング */

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-2 min-h-screen bg-gray-50">

      {/* タイトルセクション */}
      <h1 className="text-2xl md:text-3xl font-bold text-center">ナンプレ自動解答機</h1>
      <p className="text-sm md:text-base pb-2 text-center text-gray-600">数字を入力して開始ボタンを押してください。</p>

      {/* ナンプレの盤面（9x9のグリッド） */}
      <div className="grid grid-cols-9 grid-rows-9 border-4 border-black bg-white shadow-lg w-[90vw] max-w-md aspect-square">
        {indexArray.map(({ rowIndex, colIndex }) => (
          <div key={`${rowIndex}-${colIndex}`} className={`relative border border-black ${rowIndex % 3 === 0 && rowIndex !== 0 ? 'border-t-4' : ''} ${colIndex % 3 === 0 && colIndex !== 0 ? 'border-l-4' : ''} ${focusIndex.rowIndex === rowIndex && focusIndex.colIndex === colIndex ? 'bg-sky-300' : focusIndex.rowIndex === rowIndex || focusIndex.colIndex === colIndex ? 'bg-sky-100' : 'bg-white'}`}>
            {/* 数字入力フィールド */}
            <input
              type="text"
              className={`absolute top-0 left-0 w-full h-full text-center font-bold caret-transparent focus:outline-none text-3xl md:text-4xl lg:text-4xl ${colorArray[rowIndex][colIndex]}`}
              inputMode="numeric"
              value={numberArray[rowIndex][colIndex]}
              onChange={(e) => handleNumberChange(rowIndex, colIndex, e.target.value)}
              onFocus={() => handleFocusChange(rowIndex, colIndex)}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
              onBlur={() => handleFocusChange(-1, -1)}
              data-row={rowIndex}
              data-col={colIndex}
            />
            {/* 候補数字表示エリア（3x3のグリッド） */}
            <div className={`absolute top-0 left-0 w-full h-full grid grid-cols-3 grid-rows-3 ${isCandidateVisible ? '' : 'hidden'}`}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((c) => (
                <p key={`${rowIndex}-${colIndex}-${c}`} className="w-full h-full text-center content-center text-black text-[8px] md:text-xs">{candidateArray[rowIndex][colIndex].includes(c) ? c : ''}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* コントロールボタンセクション */}
      <div className="flex flex-col justify-center items-center pt-4 gap-6 w-full max-w-md md:max-w-none">
        {/* 上部ボタン行（候補表示・解答） */}
        <div className="flex justify-between gap-8">
          {/* 候補表示切り替えボタン */}
          <button className="w-16 h-16 text-4xl font-extrabold text-center content-center bg-gradient-to-br from-gray-200 to-gray-300 rounded-full hover:from-gray-300 hover:to-gray-400 shadow-md" onClick={handleCandidateButtonClick}>
            i
          </button>

          {/* 自動解答実行ボタン */}
          <button className="w-16 h-16 text-center content-center bg-gradient-to-br from-green-500 to-green-600 rounded-full hover:from-green-600 hover:to-green-700 text-white shadow-md" onClick={handleSolveButtonClick}>
            {isSolving ? (
              // 解答中の停止アイコン
              <svg className="w-10 h-10 md:w-12 md:h-12 text-white mx-auto" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M8 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H8Zm7 0a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1Z" clipRule="evenodd" />
              </svg>
            ) : (
              // 解答開始の再生アイコン
              <svg className="w-10 h-10 md:w-12 md:h-12 text-white mx-auto" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M8.6 5.2A1 1 0 0 0 7 6v12a1 1 0 0 0 1.6.8l8-6a1 1 0 0 0 0-1.6l-8-6Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* 下部ボタン行（仮定法・保存・呼び出し・クリア） */}
        <div className="flex justify-center gap-2 md:gap-4">
          {/* 仮定法切り替えボタン */}
          <button className="w-20 h-12 text-center content-center bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full hover:from-yellow-600 hover:to-yellow-700 hover:shadow-lg text-white text-xs md:text-sm font-bold shadow-md" onClick={handleAssumeFlagChange}>
            {assumeFlag ? '仮定法ON' : '仮定法OFF'}
          </button>

          {/* 盤面保存ボタン */}
          <button className="w-20 h-12 text-center content-center bg-gradient-to-br from-red-500 to-red-600 rounded-full hover:from-red-600 hover:to-red-700 hover:shadow-lg text-white text-xs md:text-sm font-bold shadow-md" onClick={handleSaveButtonClick}>
            保存
          </button>

          {/* 保存データ呼び出しボタン */}
          <button className="w-20 h-12 text-center content-center bg-gradient-to-br from-blue-500 to-blue-600 rounded-full hover:from-blue-600 hover:to-blue-700 hover:shadow-lg text-white text-xs md:text-sm font-bold shadow-md" onClick={handleCallButtonClick}>
            呼び出し
          </button>

          {/* 盤面クリアボタン */}
          <button className="w-20 h-12 text-center content-center bg-gradient-to-br from-green-500 to-green-600 rounded-full hover:from-green-600 hover:to-green-700 hover:shadow-lg text-white text-xs md:text-sm font-bold shadow-md" onClick={handleClearButtonClick}>
            クリア
          </button>
        </div>
      </div>
    </div>
  )
};

export default App;
