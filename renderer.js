const { ipcRenderer } = require('electron');
const fs = require('fs');
const pdfMake = require('pdfmake');
const tinymce = require('tinymce');
require('./iconmanagement');

// Application logic for managing projects, saving to disk, and exporting as PDF

const projectsContainer = document.getElementById('projects-container');
const projectList = document.getElementById('project-list');
const projectDetails = document.getElementById('project-details');
const addProjectButton = document.getElementById('add-project-button');

let projects = [];

function handleImageRightClick(event) {
  event.preventDefault();

  const imagePath = event.target.getAttribute('src');
  if (!imagePath) return;

  window.ipcRenderer.send('show-image-context-menu', imagePath);
}

// Load projects from disk
function loadProjects() {
  const projectsFilePath = getProjectsFilePath();

  if (fs.existsSync(projectsFilePath)) {
    projects = JSON.parse(fs.readFileSync(projectsFilePath));
    displayProjects();
  }
}

// Save projects to disk
function saveProjects() {
  const projectsFilePath = getProjectsFilePath();
  fs.writeFileSync(projectsFilePath, JSON.stringify(projects));
}

// Get the projects file path based on the user's platform
function getProjectsFilePath() {
  const userDataPath = ipcRenderer.sendSync('get-user-data-path');
  return `${userDataPath}/projects.json`;
}

// Display the list of projects
function displayProjects() {
  projectList.innerHTML = '';
  projects.forEach((project, index) => {
    console.log("displayProjects() forEach loop: ", index);
    const listItem = document.createElement('li');
    const statusSpan = document.createElement('span');

    statusSpan.className = getIconClassName(project.project_status);
    statusSpan.classList.add(getStatusColor(project.project_status));

    listItem.appendChild(document.createTextNode(project.title + ' '));
    listItem.appendChild(statusSpan);

    listItem.title = `View ${project.title} (${project.project_status})`
    listItem.addEventListener('click', function() {
      displayProjectDetails(index);

      // Remove the 'active' class from all list items
      const allListItems = projectList.getElementsByTagName('li');
      for (let i = 0; i < allListItems.length; i++) {
        allListItems[i].classList.remove('active');
      }

      // Add the 'active' class to the clicked list item
      this.classList.add('active');
    });
    projectList.appendChild(listItem);
    updateProjectListItems();
  });
}


function getIconClassName(status) {
  switch (status) {
    case 'Done':
      return 'la la-check-circle';
    case 'In Progress':
      return 'la la-refresh';
    case 'To-Do':
      return 'la la-tasks';
    case 'Canceled':
      return 'la la-times-circle';
    default:
      return 'no-icon';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'Done':
      return 'status-done';
    case 'In Progress':
      return 'status-in-progress';
    case 'To-Do':
      return 'status-to-do';
    case 'Canceled':
      return 'status-canceled';
    default:
      return 'status-none';
  }
}

// Display project details
function displayProjectDetails(index) {
  const project = projects[index];

  // Generate the project details HTML and display it
  projectDetails.innerHTML = `
      <div id="project-details-view">
        <h3 id="main-project-title">
            ${project.title}
            <span id="state-district-title">
                ${(project.state !== undefined && project.district_number !== undefined && project.state !== 'None') ? (project.state + project.district_number) : ''}
            </span>
        </h3>  
        <div class="team-wrapper" id="team-wrapper">
            <p>
                <span id="team-wrapper-prod" class="team-wrapper-prod"><i id="production_label">Production:</i> <span id="production_person">${project.production_person}</span></span>
                <span id="details-name" class="details-name"> | </span>
                <span id="team-wrapper-design" class="team-wrapper-design"><i id="design_label">Design:</i> <span id="designer">${project.designer}</span></span>
            </p>
        </div>
        <p><strong class="details-name">Project Status:</strong> ${project.project_status}</p>
        <p><strong class="details-name">Project Type:</strong> ${project.project_type}</p>
        <p><strong class="details-name">Project Contact:</strong> ${project.contact}</p>
        <p><strong class="details-name">CMS Vendor:</strong> ${project.vendor}</p>
        <p><strong class="details-name">CMS Vendor Contact:</strong> ${project.vendor_contact}</p>
        <p><strong class="details-name">Drupal Version:</strong> ${project.drupal_version}</p>
        <p><strong class="details-name">Dev URL:</strong> ${project.dev_url}</p>
        <p><strong class="details-name">Staging URL:</strong> ${project.staging_url}</p>
        <p><strong class="details-name">Prod URL:</strong> ${project.prod_url}</p>
        <p id="notes-area"><strong class="details-name">Notes:</strong></p>
        <p>${project.notes}</p>
        <div id="images-wrapper">
            ${project.images && project.images.length
                ? project.images
                    .map(
                    (image, i) => `<div class="image-container">
                        <img src="${image}" alt="Project Image" class="project-image" data-index="${i}" />
                        <button title="Delete Image" class="delete-image-button" data-index="${i}"><i class="las la-trash-alt"></i></button>
                    </div>`
                    )
                    .join('')
                : ''}
        </div>
      </div>
      <div id="project-buttons-wrapper">
        <button id="edit-project-button" title="Edit Project Details">
            <i class="las la-edit"></i>
        </button>
        <button id="delete-project-button" title="Delete Project">
            <i class="las la-trash-alt"></i>
        </button>
      </div>
    `;                    

  projectDetails.classList.remove('hidden');

  tinymce.remove('#notes');

  // Attach event listeners to the edit and delete buttons
  document.getElementById('edit-project-button').addEventListener('click', () => editProject(index));
  document.getElementById('delete-project-button').addEventListener('click', () => deleteProject(index));

  if (project.images && project.images.length) {
    const projectImages = document.querySelectorAll('.project-image');
    projectImages.forEach((projectImage) => {
      projectImage.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const imageIndex = parseInt(event.target.dataset.index);
        ipcRenderer.send('show-item-in-folder', project.images[imageIndex]);
      });
    });
  }

  if (project.images && project.images.length) {
    const deleteImageButtons = document.querySelectorAll('.delete-image-button');
    deleteImageButtons.forEach((deleteImageButton) => {
    deleteImageButton.addEventListener('click', () => {
        const imageIndex = parseInt(deleteImageButton.dataset.index);
        ipcRenderer.send('confirm-delete-image', index, imageIndex);
        });
    });
    ipcRenderer.on('confirmed-delete-image', (event, projectIndex, imageIndex) => {
        deleteImage(projectIndex, imageIndex);
      });
  }

  displayTeamInfo(project.production_person, project.designer);
}

// Add a new project
function addProject() {
  console.log("addProject() function called");
  showProjectForm();
  tinymce.remove('#notes');
  tinymce.init({
    selector: '#notes',
    skin: 'oxide-dark',
    content_css: 'dark'
  });
  projectDetails.classList.remove('hidden');
}

// Edit a project
function editProject(index) {
  const project = projects[index];
  showProjectForm(project, index);
  tinymce.remove('#notes');
  tinymce.init({
    selector: '#notes',
    skin: 'oxide-dark',
    content_css: 'dark'
  });
}

// Delete a project
function deleteProject(index) {
    ipcRenderer.send('confirm-delete', index);
}

ipcRenderer.on('confirmed-delete', (event, index) => {
    projects.splice(index, 1);
    saveProjects();
    displayProjects();
    projectDetails.classList.add('hidden');
  });
  

function handleFormSubmit(isEdit, index, updatedProject) {
    if (isEdit) {
      projects[index] = updatedProject;
    } else {
      projects.push(updatedProject);
    }
    // Retrieve the content of the TinyMCE editor and assign it to the `notes` property
    updatedProject.notes = tinymce.activeEditor.getContent();
    saveProjects();
    displayProjects();
    // projectDetails.classList.add('hidden');
    tinymce.remove('#notes');
    tinymce.init({
        selector: '#notes',
        skin: 'oxide-dark',
        content_css: 'dark'
      });
    console.log("handleFormSubmit() called");
    updateProjectListItems();
}

  function deleteImage(index, imageIndex) {
    console.log('Image deleted at index: ', imageIndex);
    projects[index].images.splice(imageIndex, 1);
    saveProjects();
    displayProjects();
    displayProjectDetails(index);
  }

// Display the project edit form
function showProjectForm(project = null, index = null) {
  const isEdit = project !== null;

  projectDetails.innerHTML = `
        <h3>${isEdit ? 'Edit' : 'Add'} Project</h3>
        <form id="project-form">
            <label for="title">Title:</label>
            <input type="text" id="title" name="title" value="${project ? project.title : ''}" />
            <br />
            <label for="project_status">Project Status:</label>
            <select id="project_status" name="project_status">
                <option value="None"${project && project.project_status === 'None' ? ' selected' : ''}>None</option>
                <option value="To-Do"${project && project.project_status === 'To-Do' ? ' selected' : ''}>To-Do</option>
                <option value="In Progress"${project && project.project_status === 'In Progress' ? ' selected' : ''}>In Progress</option>
                <option value="Canceled"${project && project.project_status === 'Canceled' ? ' selected' : ''}>Canceled</option>
                <option value="Done"${project && project.project_status === 'Done' ? ' selected' : ''}>Done</option>
            </select>
            <br />
            <label for="designer">Designer:</label>
            <input type="text" id="designer" name="designer" value="${project ? project.designer : ''}" />
            <br />
            <label for="production_person">Production Person:</label>
            <input type="text" id="production_person" name="production_person" value="${project ? project.production_person : ''}" />
            <br />
            <label for="contact">Project Contact:</label>
            <input type="text" id="contact" name="contact" value="${project ? project.contact : ''}" />
            <br />
            <label for="state">State:</label>
            <select id="state" name="state">
                <option value="None"${project && project.state === 'None' ? ' selected' : ''}>None</option>
                <option value="AL"${project && project.state === 'AL' ? ' selected' : ''}>Alabama</option>
                <option value="AK"${project && project.state === 'AK' ? ' selected' : ''}>Alaska</option>
                <option value="AZ"${project && project.state === 'AZ' ? ' selected' : ''}>Arizona</option>
                <option value="AR"${project && project.state === 'AR' ? ' selected' : ''}>Arkansas</option>
                <option value="CA"${project && project.state === 'CA' ? ' selected' : ''}>California</option>
                <option value="CO"${project && project.state === 'CO' ? ' selected' : ''}>Colorado</option>
                <option value="CT"${project && project.state === 'CT' ? ' selected' : ''}>Connecticut</option>
                <option value="DE"${project && project.state === 'DE' ? ' selected' : ''}>Delaware</option>
                <option value="FL"${project && project.state === 'FL' ? ' selected' : ''}>Florida</option>
                <option value="GA"${project && project.state === 'GA' ? ' selected' : ''}>Georgia</option>
                <option value="HI"${project && project.state === 'HI' ? ' selected' : ''}>Hawaii</option>
                <option value="ID"${project && project.state === 'ID' ? ' selected' : ''}>Idaho</option>
                <option value="IL"${project && project.state === 'IL' ? ' selected' : ''}>Illinois</option>
                <option value="IN"${project && project.state === 'IN' ? ' selected' : ''}>Indiana</option>
                <option value="IA"${project && project.state === 'IA' ? ' selected' : ''}>Iowa</option>
                <option value="KS"${project && project.state === 'KS' ? ' selected' : ''}>Kansas</option>
                <option value="KY"${project && project.state === 'KY' ? ' selected' : ''}>Kentucky</option>
                <option value="LA"${project && project.state === 'LA' ? ' selected' : ''}>Louisiana</option>
                <option value="ME"${project && project.state === 'ME' ? ' selected' : ''}>Maine</option>
                <option value="MD"${project && project.state === 'MD' ? ' selected' : ''}>Maryland</option>
                <option value="MA"${project && project.state === 'MA' ? ' selected' : ''}>Massachusetts</option>
                <option value="MI"${project && project.state === 'MI' ? ' selected' : ''}>Michigan</option>
                <option value="MN"${project && project.state === 'MN' ? ' selected' : ''}>Minnesota</option>
                <option value="MS"${project && project.state === 'MS' ? ' selected' : ''}>Mississippi</option>
                <option value="MO"${project && project.state === 'MO' ? ' selected' : ''}>Missouri</option>
                <option value="MT"${project && project.state === 'MT' ? ' selected' : ''}>Montana</option>
                <option value="NE"${project && project.state === 'NE' ? ' selected' : ''}>Nebraska</option>
                <option value="NV"${project && project.state === 'NV' ? ' selected' : ''}>Nevada</option>
                <option value="NH"${project && project.state === 'NH' ? ' selected' : ''}>New Hampshire</option>
                <option value="NJ"${project && project.state === 'NJ' ? ' selected' : ''}>New Jersey</option>
                <option value="NM"${project && project.state === 'NM' ? ' selected' : ''}>New Mexico</option>
                <option value="NY"${project && project.state === 'NY' ? ' selected' : ''}>New York</option>
                <option value="NC"${project && project.state === 'NC' ? ' selected' : ''}>North Carolina</option>
                <option value="ND"${project && project.state === 'ND' ? ' selected' : ''}>North Dakota</option>
                <option value="OH"${project && project.state === 'OH' ? ' selected' : ''}>Ohio</option>
                <option value="OK"${project && project.state === 'OK' ? ' selected' : ''}>Oklahoma</option>
                <option value="OR"${project && project.state === 'OR' ? ' selected' : ''}>Oregon</option>
                <option value="PA"${project && project.state === 'PA' ? ' selected' : ''}>Pennsylvania</option>
                <option value="RI"${project && project.state === 'RI' ? ' selected' : ''}>Rhode Island</option>
                <option value="SC"${project && project.state === 'SC' ? ' selected' : ''}>South Carolina</option>
                <option value="SD"${project && project.state === 'SD' ? ' selected' : ''}>South Dakota</option>
                <option value="TN"${project && project.state === 'TN' ? ' selected' : ''}>Tennessee</option>
                <option value="TX"${project && project.state === 'TX' ? ' selected' : ''}>Texas</option>
                <option value="UT"${project && project.state === 'UT' ? ' selected' : ''}>Utah</option>
                <option value="VT"${project && project.state === 'VT' ? ' selected' : ''}>Vermont</option>
                <option value="VA"${project && project.state === 'VA' ? ' selected' : ''}>Virginia</option>
                <option value="WA"${project && project.state === 'WA' ? ' selected' : ''}>Washington</option>
                <option value="WV"${project && project.state === 'WV' ? ' selected' : ''}>West Virginia</option>
                <option value="WI"${project && project.state === 'WI' ? ' selected' : ''}>Wisconsin</option>
                <option value="WY"${project && project.state === 'WY' ? ' selected' : ''}>Wyoming</option>
                <option value="AS"${project && project.state === 'AS' ? ' selected' : ''}>American Samoa</option>
                <option value="DC"${project && project.state === 'DC' ? ' selected' : ''}>District of Columbia</option>
                <option value="FM"${project && project.state === 'FM' ? ' selected' : ''}>Federated States of Micronesia</option>
                <option value="GU"${project && project.state === 'GU' ? ' selected' : ''}>Guam</option>
                <option value="MH"${project && project.state === 'MH' ? ' selected' : ''}>Marshall Islands</option>
                <option value="MP"${project && project.state === 'MP' ? ' selected' : ''}>Northern Mariana Islands</option>
                <option value="PW"${project && project.state === 'PW' ? ' selected' : ''}>Palau</option>
                <option value="PR"${project && project.state === 'PR' ? ' selected' : ''}>Puerto Rico</option>
                <option value="VI"${project && project.state === 'VI' ? ' selected' : ''}>Virgin Islands</option>
            </select>
            <br />
            <label for="district_number">District Number:</label>
            <input type="text" id="district_number" name="district_number" oninput="this.value = this.value.replace(/[^0-9]/g, '').substr(0, 2);" title="Enter exactly two digits between 00 and 99" value="${project ? project.district_number : ''}"/>
            <br />
            <label for="vendor">CMS Vendor:</label>
            <input type="text" id="vendor" name="vendor" value="${project ? project.vendor : ''}" />
            <br />
            <label for="vendor_contact">Vendor Contact:</label>
            <input type="text" id="vendor_contact" name="vendor_contact" value="${project ? project.vendor_contact : ''}" />
            <br />
            <label for="drupal_version">Drupal Version:</label>
            <input type="text" id="drupal_version" name="drupal_version" value="${project ? project.drupal_version : ''}" />
            <br />
            <label for="dev_url">Dev URL:</label>
            <input type="text" id="dev_url" name="dev_url" value="${project ? project.dev_url : ''}" />
            <br />
            <label for="staging_url">Staging URL:</label>
            <input type="text" id="staging_url" name="staging_url" value="${project ? project.staging_url : ''}" />
            <br />
            <label for="prod_url">Prod URL:</label>
            <input type="text" id="prod_url" name="prod_url" value="${project ? project.prod_url : ''}" />
            <br />
            <label for="project_type">Project Type:</label>
            <input type="text" id="project_type" name="project_type" value="${project ? project.project_type : ''}" />
            <br />
            <label for="notes">Notes:</label>
            <textarea id="notes" name="notes">${project ? project.notes : ''}</textarea>
            <br />
            <label for="images">Images:</label>
            <input type="file" id="images" name="images" accept="image/*" multiple />
            <br />
            <div id="images-wrapper">
                ${project && project.images
                ? project.images.map((image, i) => `
                    <div class="image-container">
                        <img src="${image}" alt="Project Image" />
                        <!-- <button class="delete-image-button" data-index="${i}" data-project-index="${index}">Delete</button> -->
                    </div>
                    `).join('')
                : ''}
            </div>
        <br />
        <div id="project-buttons-wrapper">
            <button id="save-add-btn" type="submit" title="${isEdit ? 'Save Project' : 'Add Project'}">
                ${isEdit ? '<i class="las la-save"></i>' : '<i class="las la-save"></i>'}
            </button>
        </div>
        </form>
    `;

  const projectForm = document.getElementById('project-form');
  projectForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(projectForm);
    const updatedProject = {
      title: formData.get('title'),
      contact: formData.get('contact'),
      vendor: formData.get('vendor'),
      vendor_contact: formData.get('vendor_contact'),
      drupal_version: formData.get('drupal_version'),
      notes: formData.get('notes'),
      designer: formData.get('designer'),
      production_person: formData.get('production_person'),
      dev_url: formData.get('dev_url'),
      staging_url: formData.get('staging_url'),
      prod_url: formData.get('prod_url'),
      project_type: formData.get('project_type'),
      project_status: formData.get('project_status'),
      state: formData.get('state'),
      district_number: formData.get('district_number'),
    };

    // Inside the projectForm event listener
    const imagesInput = document.getElementById('images');
    if (imagesInput.files.length > 0) {
    updatedProject.images = project ? (project.images || []) : [];
    const totalImages = imagesInput.files.length;
    let loadedImages = 0;

    Array.from(imagesInput.files).forEach((file) => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
        updatedProject.images.push(fileReader.result);
        loadedImages++;

        if (loadedImages === totalImages) {
            handleFormSubmit(isEdit, index, updatedProject);
        }
        };
        fileReader.readAsDataURL(file);
    });
    } else {
    updatedProject.images = project ? project.images : [];
    handleFormSubmit(isEdit, index, updatedProject);
    }

    // handleFormSubmit(isEdit, index, updatedProject);

    saveProjects();
    
    displayProjects();
    // projectDetails.classList.add('hidden');
  });
}

    document.addEventListener('contextmenu', (event) => {
    if (event.target.tagName.toLowerCase() === 'img') {
      handleImageRightClick(event);
    }
  });

// Load projects when the application starts
loadProjects();

// Add event listener to the add project button
addProjectButton.addEventListener('click', addProject);

// Add this to the bottom of the renderer.js file, after the last event listener
const userDataPathElement = document.getElementById('user-data-path');
userDataPathElement.textContent = `Data saved in: ${ipcRenderer.sendSync('get-user-data-path')}`;

function displayTeamInfo(production_person, designer) {
    const projectDetailsView = document.getElementById('project-details-view');
    const prodElem = document.getElementById('team-wrapper-prod');
    const designElem = document.getElementById('team-wrapper-design');
    const detailsNameElem = document.getElementById('details-name');
    const productionPersonElem = document.getElementById('production_person');
    const designerElem = document.getElementById('designer');
    const productionLabelElem = document.getElementById('production_label');
    const designLabelElem = document.getElementById('design_label');
    
    const prodDefined = production_person !== undefined && production_person !== null && production_person !== '';
    const designDefined = designer !== undefined && designer !== null && designer !== '';

    productionPersonElem.textContent = production_person;
    designerElem.textContent = designer;

    if (prodDefined && !designDefined) {
        designElem.style.display = 'none';
        designLabelElem.style.display = 'none';
        detailsNameElem.style.display = 'none';
        productionLabelElem.style.display = '';
        projectDetailsView.classList.remove('no-prod-designer');
    } else if (!prodDefined && designDefined) {
        prodElem.style.display = 'none';
        productionLabelElem.style.display = 'none';
        detailsNameElem.style.display = 'none';
        designLabelElem.style.display = '';
        projectDetailsView.classList.remove('no-prod-designer');
    } else if (!prodDefined && !designDefined) {
        prodElem.style.display = 'none';
        designElem.style.display = 'none';
        productionLabelElem.style.display = 'none';
        designLabelElem.style.display = 'none';
        detailsNameElem.style.display = 'none';
        projectDetailsView.classList.add('no-prod-designer');
    } else {
        prodElem.style.display = '';
        designElem.style.display = '';
        productionLabelElem.style.display = '';
        designLabelElem.style.display = '';
        detailsNameElem.style.display = '';
        projectDetailsView.classList.remove('no-prod-designer');
    }
}

function updateTheme() {
  const isDarkMode = true;
  // const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // document.body.dataset.theme = isDarkMode ? 'dark' : 'light';
  document.body.dataset.theme = isDarkMode ? 'dark' : 'dark';
}

updateTheme();

// window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);

document.getElementById('restart-button').addEventListener('click', () => {
  ipcRenderer.send('restart-app');
});

// if project has empty title then give it title of 'Untitled Project' in the li
function updateProjectListItems() {
    const projectListItems = document.querySelectorAll('#project-list > li');
    if (projectListItems.length > 0) {
      projectListItems.forEach(item => {
        if (!item.innerText.trim() || item.innerText.trim() === 'To-Do' || item.innerText.trim() === 'Canceled' || item.innerText.trim() === 'In Progress' || item.innerText.trim() === 'Done' || item.innerText.trim() === 'None') {
          item.innerText = 'Untitled Project';
        }
      });
    }
  }  

updateProjectListItems();