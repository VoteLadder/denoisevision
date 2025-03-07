// app.js - DenoiseVision Application
document.addEventListener('DOMContentLoaded', function() {
  // Load image list directly if available, otherwise use default patterns
  const USE_IMAGE_LIST = typeof AVAILABLE_IMAGES !== 'undefined';

  // App state
  const state = {
    user: null,
    currentScreen: 'login',
    study: null
  };

  // DOM elements
  const screens = {
    login: document.getElementById('login-screen'),
    instructions: document.getElementById('instructions-screen'),
    study: document.getElementById('study-screen'),
    completion: document.getElementById('completion-screen')
  };

  const elements = {
    userInfo: document.getElementById('user-info'),
    userInitials: document.getElementById('user-initials'),
    loginForm: document.getElementById('login-form'),
    initialsInput: document.getElementById('initials'),
    beginStudyBtn: document.getElementById('begin-study-btn'),
    ratingForm: document.getElementById('rating-form'),
    commentsText: document.getElementById('comments'),
    saveProgressBtn: document.getElementById('save-progress-btn'),
    downloadResultsBtn: document.getElementById('download-results-btn'),
    startNewBtn: document.getElementById('start-new-btn'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    loadingImages: document.getElementById('loading-images'),
    noisyImage: document.getElementById('noisy-image'),
    comparisonImage: document.getElementById('comparison-image'),
    totalImages: document.getElementById('total-images'),
    accuracyRate: document.getElementById('accuracy-rate'),
    avgOriginal: document.getElementById('avg-original'),
    avgDenoised: document.getElementById('avg-denoised'),
    currentYear: document.getElementById('current-year')
  };

  // Set current year
  elements.currentYear.textContent = new Date().getFullYear();

  // Image base paths
  const IMAGE_PATHS = {
    noisy: 'images/noisy/',
    original: 'images/original/',
    denoised: 'images/denoised/'
  };

  // Study configuration
  const STUDY_CONFIG = {
    uniqueImages: 80, // Set to 80 as in the original implementation
    duplicatePercentage: 15, // 15% duplicates
    minSpacing: 5 // Minimum spacing between duplicates
  };

  // Google Apps Script web app URL
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbydmxuiFgHfuTpM5wyg9jYZeszx6NOkUt_zcBfknoZS-0WdMdQcdGNHaJAqzaw28DEcCQ/exec';

  // Initialize the app
  function init() {
    const savedUser = localStorage.getItem('denoiseVisionUser');
    const savedStudy = localStorage.getItem('denoiseVisionStudy');
    
    if (savedUser && savedStudy) {
      state.user = JSON.parse(savedUser);
      state.study = JSON.parse(savedStudy);
      
      updateUserInfo();
      
      if (state.study.currentIndex >= state.study.imagePairs.length) {
        showScreen('completion');
        updateCompletionStats();
      } else {
        showScreen('study');
        loadCurrentPair();
      }
    } else {
      showScreen('login');
    }
    
    setupEventListeners();
  }

  // Set up event listeners
  function setupEventListeners() {
    elements.loginForm.addEventListener('submit', handleLogin);
    
    elements.beginStudyBtn.addEventListener('click', function() {
      showScreen('study');
      loadCurrentPair();
    });
    
    elements.ratingForm.addEventListener('submit', handleRatingSubmit);
    
    elements.saveProgressBtn.addEventListener('click', function() {
      saveProgress();
      alert('Progress saved! You can resume later by entering your initials again.');
    });
    
    elements.downloadResultsBtn.addEventListener('click', downloadResultsCSV);
    
    elements.startNewBtn.addEventListener('click', function() {
      if (confirm('Start a new session? Your current results will remain saved.')) {
        resetSession();
      }
    });
    
    elements.noisyImage.addEventListener('error', handleImageError);
    elements.comparisonImage.addEventListener('error', handleImageError);
  }

  // Handle login form submission
  function handleLogin(event) {
    event.preventDefault();
    
    const initials = elements.initialsInput.value.trim().toUpperCase();
    
    if (!/^[A-Z]{3}$/.test(initials)) {
      alert('Please enter exactly 3 letters for your initials.');
      return;
    }
    
    const savedStudyKey = `denoiseVision_${initials}`;
    const savedStudy = localStorage.getItem(savedStudyKey);
    
    if (savedStudy) {
      const confirmResume = confirm(`Found saved progress for ${initials}. Would you like to resume?`);
      
      if (confirmResume) {
        state.user = { initials };
        state.study = JSON.parse(savedStudy);
        
        localStorage.setItem('denoiseVisionUser', JSON.stringify(state.user));
        localStorage.setItem('denoiseVisionStudy', savedStudy);
        
        updateUserInfo();
        
        if (state.study.currentIndex >= state.study.imagePairs.length) {
          showScreen('completion');
          updateCompletionStats();
        } else {
          showScreen('study');
          loadCurrentPair();
        }
        return;
      }
    }
    
    startNewStudy(initials);
  }

  // Start a new study session
  function startNewStudy(initials) {
    state.user = { initials };
    localStorage.setItem('denoiseVisionUser', JSON.stringify(state.user));
    
    const imagePairs = generateImagePairs();
    
    state.study = {
      startTime: new Date().toISOString(),
      currentIndex: 0,
      imagePairs: imagePairs,
      results: []
    };
    
    logStudyConfiguration();
    
    localStorage.setItem('denoiseVisionStudy', JSON.stringify(state.study));
    localStorage.setItem(`denoiseVision_${initials}`, JSON.stringify(state.study));
    
    updateUserInfo();
    showScreen('instructions');
  }

  // Generate image pairs based on available images
  function generateImagePairs() {
    let imageFilenames = [];
    
    if (USE_IMAGE_LIST && AVAILABLE_IMAGES && AVAILABLE_IMAGES.length > 0) {
      console.log("Using pre-generated image list:", AVAILABLE_IMAGES);
      imageFilenames = [...AVAILABLE_IMAGES];
    } else {
      console.log("No image list found, generating sequential filenames");
      for (let i = 1; i <= 80; i++) {
        imageFilenames.push(`image_${i.toString().padStart(3, '0')}.jpg`);
      }
    }
    
    const pairs = [];
    
    const availableCount = imageFilenames.length;
    const uniqueImageCount = Math.min(availableCount, STUDY_CONFIG.uniqueImages);
    
    let selectedImages = imageFilenames;
    if (availableCount > uniqueImageCount) {
      selectedImages = shuffleArray([...imageFilenames]).slice(0, uniqueImageCount);
    }
    
    console.log(`Using ${selectedImages.length} unique images from ${availableCount} available images`);
    
    for (let i = 0; i < selectedImages.length; i++) {
      const filename = selectedImages[i];
      const isDenoised = Math.random() > 0.5;
      
      pairs.push({
        id: i + 1,
        filename: filename,
        comparisonType: isDenoised ? 'denoised' : 'original'
      });
    }
    
    const duplicateCount = Math.round(pairs.length * (STUDY_CONFIG.duplicatePercentage / 100));
    const duplicateIndices = getRandomIndices(pairs.length, duplicateCount);
    const duplicates = duplicateIndices.map(index => ({...pairs[index]}));
    
    let finalPairs = [...pairs];
    
    for (const duplicate of duplicates) {
      const originalPos = finalPairs.findIndex(p => 
        p.id === duplicate.id && p.filename === duplicate.filename);
      
      const validPositions = [];
      for (let i = 0; i <= finalPairs.length; i++) {
        if (originalPos === -1 || Math.abs(i - originalPos) >= STUDY_CONFIG.minSpacing) {
          validPositions.push(i);
        }
      }
      
      if (validPositions.length > 0) {
        const insertPos = validPositions[Math.floor(Math.random() * validPositions.length)];
        finalPairs = [
          ...finalPairs.slice(0, insertPos),
          duplicate,
          ...finalPairs.slice(insertPos)
        ];
      } else {
        finalPairs.push(duplicate);
      }
    }
    
    console.log(`Generated ${finalPairs.length} total image pairs (including ${duplicates.length} duplicates)`);
    return finalPairs;
  }

  // Get random indices for duplicates
  function getRandomIndices(max, count) {
    const indices = [];
    while (indices.length < count && indices.length < max) {
      const randomIndex = Math.floor(Math.random() * max);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }
    return indices;
  }

  // Fisher-Yates shuffle algorithm
  function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  // Update user info display
  function updateUserInfo() {
    if (state.user) {
      elements.userInfo.classList.remove('hidden');
      elements.userInitials.textContent = state.user.initials;
    } else {
      elements.userInfo.classList.add('hidden');
    }
  }

  // Show a specific screen
  function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
      screen.classList.add('hidden');
    });
    
    screens[screenName].classList.remove('hidden');
    state.currentScreen = screenName;
  }

  // Load the current image pair
  function loadCurrentPair() {
    if (!state.study || state.study.currentIndex >= state.study.imagePairs.length) {
      return;
    }
    
    const currentPair = state.study.imagePairs[state.study.currentIndex];
    const totalImages = state.study.imagePairs.length;
    const progress = Math.round((state.study.currentIndex / totalImages) * 100);
    
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = `Image ${state.study.currentIndex + 1} of ${totalImages}`;
    
    elements.ratingForm.reset();
    elements.commentsText.value = '';
    
    elements.loadingImages.classList.remove('hidden');
    
    const noisyPath = IMAGE_PATHS.noisy + currentPair.filename;
    const comparisonPath = IMAGE_PATHS[currentPair.comparisonType] + currentPair.filename;
    
    console.log('Loading images:', { 
      index: state.study.currentIndex + 1,
      noisyPath, 
      comparisonPath,
      currentPair
    });
    
    elements.noisyImage.onload = checkImagesLoaded;
    elements.comparisonImage.onload = checkImagesLoaded;
    
    elements.noisyImage.src = noisyPath;
    elements.comparisonImage.src = comparisonPath;
  }

  // Check if both images are loaded
  let imagesLoaded = 0;
  function checkImagesLoaded() {
    imagesLoaded++;
    if (imagesLoaded >= 2) {
      elements.loadingImages.classList.add('hidden');
      imagesLoaded = 0;
    }
  }
  
  // Log study configuration to console (for debugging)
  function logStudyConfiguration() {
    if (state.study) {
      const totalImages = state.study.imagePairs.length;
      const uniqueFilenames = new Set(state.study.imagePairs.map(p => p.filename));
      const uniqueImages = uniqueFilenames.size;
      const duplicateImages = totalImages - uniqueImages;
      
      console.log(`Study Configuration:
• ${uniqueImages} unique images
• ${duplicateImages} duplicate images (${((duplicateImages/uniqueImages)*100).toFixed(1)}%)
• ${totalImages} total images to evaluate`);
    }
  }

  // Handle image loading errors
  function handleImageError(event) {
    const img = event.target;
    console.error('Failed to load image:', img.src);
    img.classList.add('error');
    img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23fdd%22%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23c00%22%3EError%20loading%20image%3C%2Ftext%3E%3C%2Fsvg%3E';
    checkImagesLoaded();
  }

  // Handle rating form submission
  function handleRatingSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(elements.ratingForm);
    const quality = parseInt(formData.get('quality'));
    const imageType = formData.get('imageType');
    const comments = elements.commentsText.value.trim();
    
    if (!quality || !imageType) {
      alert('Please complete all required ratings before proceeding');
      return;
    }
    
    saveRating(quality, imageType, comments);
  }

  // Save the current rating and move to next image
  function saveRating(quality, imageType, comments) {
    const currentPair = state.study.imagePairs[state.study.currentIndex];
    
    const rating = {
      userId: state.user.initials, // Add user ID (initials) to each result
      timestamp: new Date().toISOString(),
      imageId: currentPair.id,
      filename: currentPair.filename,
      comparisonType: currentPair.comparisonType,
      overallQuality: quality,
      perceivedAs: imageType,
      comments: comments,
      correctAssessment: imageType === currentPair.comparisonType
    };
    
    state.study.results.push(rating);
    
    state.study.currentIndex++;
    
    saveProgress();
    
    if (state.study.currentIndex >= state.study.imagePairs.length) {
      completeStudy();
    } else {
      loadCurrentPair();
    }
  }

  // Save current progress
  function saveProgress() {
    if (!state.user || !state.study) return;
    
    const studyData = JSON.stringify(state.study);
    localStorage.setItem('denoiseVisionStudy', studyData);
    localStorage.setItem(`denoiseVision_${state.user.initials}`, studyData);
  }

  // Complete the study and send results automatically
  async function completeStudy() {
    showScreen('completion');
    updateCompletionStats();
    
    // Automatically send results to Google Sheet
    await sendResultsToGoogleSheet();
  }

  // Update completion statistics
  function updateCompletionStats() {
    if (!state.study || !state.study.results) return;
    
    const results = state.study.results;
    
    elements.totalImages.textContent = results.length.toString();
    
    const correctAssessments = results.filter(r => r.correctAssessment).length;
    const accuracyPercentage = ((correctAssessments / results.length) * 100).toFixed(1);
    elements.accuracyRate.textContent = `${accuracyPercentage}%`;
    
    const originalResults = results.filter(r => r.comparisonType === 'original');
    const denoisedResults = results.filter(r => r.comparisonType === 'denoised');
    
    const avgOriginal = originalResults.length > 0 
      ? originalResults.reduce((sum, r) => sum + r.overallQuality, 0) / originalResults.length 
      : 0;
      
    const avgDenoised = denoisedResults.length > 0 
      ? denoisedResults.reduce((sum, r) => sum + r.overallQuality, 0) / denoisedResults.length 
      : 0;
    
    elements.avgOriginal.textContent = avgOriginal.toFixed(1);
    elements.avgDenoised.textContent = avgDenoised.toFixed(1);
  }

  // Download results as CSV
  function downloadResultsCSV() {
    if (!state.study || !state.study.results || state.study.results.length === 0) {
      alert('No results available to download');
      return;
    }
    
    const results = state.study.results;
    
    const headers = [
      'userId', // Add userId to CSV headers
      'timestamp',
      'imageId',
      'filename',
      'comparisonType',
      'overallQuality',
      'perceivedAs',
      'correctAssessment',
      'comments'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    for (const result of results) {
      const row = [
        result.userId, // Include userId in CSV row
        result.timestamp,
        result.imageId,
        result.filename,
        result.comparisonType,
        result.overallQuality,
        result.perceivedAs,
        result.correctAssessment ? 'true' : 'false',
        `"${result.comments.replace(/"/g, '""')}"`
      ];
      
      csvContent += row.join(',') + '\n';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `denoiser_results_${state.user.initials}_${timestamp}.csv`;
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Send results to Google Sheet via Apps Script with no-cors
  async function sendResultsToGoogleSheet() {
    if (!state.study || !state.study.results || state.study.results.length === 0) {
      console.log('No results to send');
      return;
    }

    try {
      console.log('Sending data to Google Sheet:', JSON.stringify(state.study));
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Bypass CORS preflight
        body: JSON.stringify(state.study),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('POST request sent to Google Apps Script');
    } catch (error) {
      console.error('Error sending results to Google Sheet:', error);
      // Optionally log this error somewhere persistent if needed
    }
  }

  // Reset session and start a new one
  function resetSession() {
    localStorage.removeItem('denoiseVisionUser');
    localStorage.removeItem('denoiseVisionStudy');
    
    state.user = null;
    state.study = null;
    
    elements.loginForm.reset();
    elements.ratingForm.reset();
    elements.commentsText.value = '';
    
    updateUserInfo();
    showScreen('login');
  }

  // Start the app
  init();
});