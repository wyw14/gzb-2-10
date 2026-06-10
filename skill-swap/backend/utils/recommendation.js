const LEVELS = ['入门', '初级', '中级', '高级', '专家'];

function getLevelIndex(level) {
  return LEVELS.indexOf(level);
}

function getNextLevel(level) {
  const idx = getLevelIndex(level);
  if (idx < LEVELS.length - 1) {
    return LEVELS[idx + 1];
  }
  return null;
}

function analyzeSkillTree(skillTree) {
  const mastered = skillTree.filter(n => n.status === 'mastered');
  const learning = skillTree.filter(n => n.status === 'learning');
  const planning = skillTree.filter(n => n.status === 'planning');

  const categoryStats = {};
  skillTree.forEach(node => {
    if (!categoryStats[node.category]) {
      categoryStats[node.category] = {
        mastered: 0,
        learning: 0,
        planning: 0,
        total: 0,
        highestLevel: '入门'
      };
    }
    categoryStats[node.category][node.status]++;
    categoryStats[node.category].total++;
    if (getLevelIndex(node.level) > getLevelIndex(categoryStats[node.category].highestLevel)) {
      categoryStats[node.category].highestLevel = node.level;
    }
  });

  return {
    mastered,
    learning,
    planning,
    categoryStats,
    totalCount: skillTree.length
  };
}

function analyzeExchanges(exchanges, userId) {
  const myExchanges = exchanges.filter(e =>
    (e.initiatorId === userId || e.partnerId === userId) && e.status === 'completed'
  );

  const asInitiator = myExchanges.filter(e => e.initiatorId === userId);
  const asPartner = myExchanges.filter(e => e.partnerId === userId);

  const learnedSkills = {};
  const taughtSkills = {};

  myExchanges.forEach(ex => {
    const isInitiator = ex.initiatorId === userId;

    if (isInitiator) {
      if (ex.skills?.learn) {
        ex.skills.learn.forEach(skill => {
          learnedSkills[skill] = (learnedSkills[skill] || 0) + 1;
        });
      }
      if (ex.skills?.teach) {
        ex.skills.teach.forEach(skill => {
          taughtSkills[skill] = (taughtSkills[skill] || 0) + 1;
        });
      }
    } else {
      if (ex.skills?.teach) {
        ex.skills.teach.forEach(skill => {
          learnedSkills[skill] = (learnedSkills[skill] || 0) + 1;
        });
      }
      if (ex.skills?.learn) {
        ex.skills.learn.forEach(skill => {
          taughtSkills[skill] = (taughtSkills[skill] || 0) + 1;
        });
      }
    }
  });

  return {
    totalExchanges: myExchanges.length,
    asInitiatorCount: asInitiator.length,
    asPartnerCount: asPartner.length,
    learnedSkills,
    taughtSkills,
    exchangeBreakdown: {
      asInitiator: asInitiator.length,
      asPartner: asPartner.length
    }
  };
}

function getLearnSkills(skills, userId) {
  return skills.filter(s => s.userId === userId && s.type === 'learn');
}

function getTeachSkills(skills, userId) {
  return skills.filter(s => s.userId === userId && s.type === 'teach');
}

function recommendNextSkills(userId, users, skills, exchanges, skillTree) {
  const user = users.find(u => u.id === userId);
  if (!user) return [];

  const treeAnalysis = analyzeSkillTree(skillTree);
  const exchangeAnalysis = analyzeExchanges(exchanges, userId);
  const learnSkills = getLearnSkills(skills, userId);

  const recommendations = [];

  for (const category in treeAnalysis.categoryStats) {
    const stats = treeAnalysis.categoryStats[category];

    if (stats.learning > 0) {
      const learningNodes = skillTree.filter(n => n.category === category && n.status === 'learning');
      learningNodes.forEach(node => {
        const nextLevel = getNextLevel(node.level);
        if (nextLevel) {
          recommendations.push({
            skillName: node.name,
            category,
            currentLevel: node.level,
            targetLevel: nextLevel,
            reason: '继续深化当前学习中的技能',
            priority: 100,
            type: 'upgrade'
          });
        }
      });
    }

    if (stats.planning > 0 && stats.learning === 0) {
      const planningNodes = skillTree.filter(n => n.category === category && n.status === 'planning');
      if (planningNodes.length > 0) {
        const node = planningNodes[0];
        recommendations.push({
          skillName: node.name,
          category,
          currentLevel: node.level,
          targetLevel: getNextLevel(node.level) || '初级',
          reason: '开始学习计划中的技能',
          priority: 85,
          type: 'start'
        });
      }
    }

    if (stats.mastered > 0 && stats.learning === 0 && stats.planning === 0) {
      const masteredNodes = skillTree.filter(n => n.category === category && n.status === 'mastered');
      if (masteredNodes.length > 0) {
        const highestNode = masteredNodes.reduce((a, b) =>
          getLevelIndex(a.level) > getLevelIndex(b.level) ? a : b
        );
        const nextLevel = getNextLevel(highestNode.level);
        if (nextLevel) {
          recommendations.push({
            skillName: highestNode.name,
            category,
            currentLevel: highestNode.level,
            targetLevel: nextLevel,
            reason: '向更高阶进阶',
            priority: 70,
            type: 'advance'
          });
        }
      }
    }
  }

  learnSkills.forEach(skill => {
    const existsInTree = skillTree.some(n => n.name === skill.name);
    if (!existsInTree) {
      recommendations.push({
        skillName: skill.name,
        category: skill.category,
        currentLevel: '入门',
        targetLevel: '初级',
        reason: '你想学的技能',
        priority: 90,
        type: 'new-learn'
      });
    }
  });

  for (const skillName in exchangeAnalysis.learnedSkills) {
    const existsInTree = skillTree.some(n => n.name === skillName);
    if (!existsInTree) {
      recommendations.push({
        skillName,
        category: 'other',
        currentLevel: '入门',
        targetLevel: '初级',
        reason: '通过交换接触过的技能',
        priority: 60,
        type: 'exchange-experience'
      });
    }
  }

  recommendations.sort((a, b) => b.priority - a.priority);

  return recommendations.slice(0, 6);
}

function recommendPartners(userId, users, skills, exchanges, recommendedSkills) {
  const otherUsers = users.filter(u => u.id !== userId);
  const partners = [];

  for (const other of otherUsers) {
    const otherTeachSkills = getTeachSkills(skills, other.id);
    const otherLearnSkills = getLearnSkills(skills, other.id);
    const myTeachSkills = getTeachSkills(skills, userId);

    if (otherTeachSkills.length === 0) continue;

    let matchCount = 0;
    let matchedSkills = [];
    let totalPriority = 0;

    recommendedSkills.forEach(rec => {
      const matched = otherTeachSkills.filter(s =>
        s.name.toLowerCase().includes(rec.skillName.toLowerCase()) ||
        rec.skillName.toLowerCase().includes(s.name.toLowerCase())
      );
      if (matched.length > 0) {
        matchCount++;
        matchedSkills.push(...matched.map(s => s.name));
        totalPriority += rec.priority;
      }
    });

    if (matchCount > 0) {
      let canTeachThem = otherLearnSkills.filter(s =>
        myTeachSkills.some(t =>
          t.name.toLowerCase().includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(t.name.toLowerCase())
        )
      ).length;

      const baseScore = Math.min(100, totalPriority / recommendedSkills.length);
      const bonusScore = canTeachThem * 10;
      const finalScore = Math.min(100, Math.round(baseScore + bonusScore));

      partners.push({
        userId: other.id,
        user: {
          id: other.id,
          username: other.username,
          avatar: other.avatar,
          bio: other.bio,
          rating: other.rating,
          exchangeCount: other.exchangeCount
        },
        score: finalScore,
        matchedSkills: {
          iCanLearn: [...new Set(matchedSkills)],
          iCanTeach: myTeachSkills
            .filter(t => otherLearnSkills.some(l =>
              l.name.toLowerCase().includes(t.name.toLowerCase()) ||
              t.name.toLowerCase().includes(l.name.toLowerCase())
            ))
            .map(s => s.name)
        },
        matchedRecommendations: recommendedSkills.filter(r =>
          matchedSkills.some(s =>
            s.toLowerCase().includes(r.skillName.toLowerCase()) ||
            r.skillName.toLowerCase().includes(s.toLowerCase())
          )
        ),
        matchCount
      });
    }
  }

  return partners.sort((a, b) => b.score - a.score);
}

function getSkillGrowthPath(userId, users, skills, exchanges, skillTree) {
  const recommendedSkills = recommendNextSkills(userId, users, skills, exchanges, skillTree);
  const recommendedPartners = recommendPartners(userId, users, skills, exchanges, recommendedSkills);

  const treeAnalysis = analyzeSkillTree(skillTree);
  const exchangeAnalysis = analyzeExchanges(exchanges, userId);

  const currentStage = calculateCurrentStage(treeAnalysis, exchangeAnalysis);

  return {
    currentStage,
    recommendedSkills,
    recommendedPartners,
    stats: {
      totalSkills: treeAnalysis.totalCount,
      masteredSkills: treeAnalysis.mastered.length,
      learningSkills: treeAnalysis.learning.length,
      planningSkills: treeAnalysis.planning.length,
      completedExchanges: exchangeAnalysis.totalExchanges,
      exchangesAsInitiator: exchangeAnalysis.asInitiatorCount,
      exchangesAsPartner: exchangeAnalysis.asPartnerCount
    }
  };
}

function calculateCurrentStage(treeAnalysis, exchangeAnalysis) {
  let score = 0;

  score += treeAnalysis.mastered.length * 20;
  score += treeAnalysis.learning.length * 10;
  score += exchangeAnalysis.totalExchanges * 15;

  if (score < 30) {
    return {
      name: '初学者',
      description: '刚踏上技能成长之路，加油！',
      icon: '🌱',
      progress: Math.min(100, Math.round((score / 30) * 100))
    };
  } else if (score < 80) {
    return {
      name: '探索者',
      description: '正在积极探索和学习多种技能',
      icon: '🔍',
      progress: Math.min(100, Math.round(((score - 30) / 50) * 100))
    };
  } else if (score < 150) {
    return {
      name: '成长者',
      description: '技能树茁壮成长中，继续努力！',
      icon: '🌿',
      progress: Math.min(100, Math.round(((score - 80) / 70) * 100))
    };
  } else if (score < 250) {
    return {
      name: '精通者',
      description: '已经掌握了不少技能',
      icon: '🌳',
      progress: Math.min(100, Math.round(((score - 150) / 100) * 100))
    };
  } else {
    return {
      name: '大师',
      description: '技能大师，令人敬佩！',
      icon: '👑',
      progress: 100
    };
  }
}

module.exports = {
  recommendNextSkills,
  recommendPartners,
  getSkillGrowthPath,
  analyzeSkillTree,
  analyzeExchanges
};
