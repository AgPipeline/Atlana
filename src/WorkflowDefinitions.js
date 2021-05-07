
var workflowDefinitions = [{
  name: 'Canopy Cover',
  description: 'Plot level canopy cover calculation',
  id: 1,
  steps: [{
    name: 'Mask Soil on Image',
    description: 'Masks soil from a copy of an image',
    algorithm: 'RGBA File',
    command: 'soilmask',
    fields: [{
      name: 'image',
      visibility:  'ui',
      prompt: 'Image file',
      description: 'Source image to process',
      type: 'file',
      mandatory: true,
    }]  // End  of fields
  }, {
    name: 'Plot Clip',
    description: 'Clips image to plot',
    algorithm: 'RGBA File',
    command: 'plotclip',
    fields: [{
      name: 'geometries',
      visibility: 'ui',
      prompt: 'GeoJSON file',
      description: 'GeoJSON file containing plot geometries',
      type: 'file',
      mandatory: true,
      }, {
      name: 'image',
      visibility: 'server',
      description: 'Source image to process',
      type: 'file',
      mandatory: true,
      prev_command_path: 'file:path',
    }]  // End  of fields
  }, {
    name: 'Find files',
    command: 'find_files2json',
    fields: [{
      name: 'filename',
      visibility: 'server',
      description: 'File name to find',
      type: 'string',
      mandatory: true,
      prev_command_path: 'file_name',
      }, {
      name: 'toppath',
      visibility: 'server',
      description: 'Top level folder to search on',
      type: 'folder',
      mandatory: true,
      prev_command_path: 'top_path',
    }]  // End  of fields
  }, {
    name: 'Canopy Cover',
    description: 'Calculate canopy cover on images',
    algorithm: 'RGBA Plot',
    command: 'canopycover',
    fields: [{
      name: 'experimentdata',
      visibility: 'ui',
      prompt: 'Experiment file',
      description: 'YAML file containing experiment data',
      type: 'file',
      mandatory: false,
      }, {
      name: 'foundjsonfile',
      visibility: 'server',
      description: 'JSON file containing information on files to process',
      type: 'file',
      mandatory: true,
      prev_command_path: 'found_json_file',
      }, {
      name: 'resultssearchfolder',
      visibility: 'server',
      description: 'Search path as it appears in the results',
      type: 'string',
      mandatory: true,
      prev_command_path: 'results_search_folder',
    }]  // End  of fields
  }, {
    name: 'Merge CSV',
    command: 'merge_csv',
    fields: [{
      name: 'toppath',
      visibility: 'server',
      description: 'Top level folder to search on',
      type: 'folder',
      mandatory: true,
      prev_command_path: 'top_path',
    }]  // End  of fields
  }]  // End of steps
}, {
  name: 'Ratio Canopy Cover',
  description:  'Plot level canopy cover calculation using a ratio-based soil mask',
  id: 2,
  steps: [{
    name: 'Mask Soil on Image',
    description: 'Masks soil from a copy of an image using a green-to-red ratio',
    algorithm: 'RGBA File',
    command: 'soilmask_ratio',
    fields: [{
      name: 'image',
      visibility:  'ui',
      prompt: 'Image',
      description: 'Source image to process',
      type: 'file',
      mandatory: true,
    }, {
      name: 'ratio',
      visibility: 'ui',
      prompt: 'Ratio',
      description: 'Lower bound of green:red ratio for non-soil pixels',
      type: 'float',
      lowerbound: 0.0,
      upperbound: 5.0,
      default: 1.0,
    }]  // End  of fields
  }, {
    name: 'Plot Clip',
    description: 'Clips image to plot',
    algorithm: 'RGBA File',
    command: 'plotclip',
    fields: [{
      name: 'geometries',
      visibility: 'ui',
      prompt: 'GeoJSON',
      description: 'GeoJSON file containing plot geometries',
      type: 'file',
      mandatory: true,
      }, {
      name: 'image',
      visibility: 'server',
      description: 'Source image to process',
      type: 'file',
      mandatory: true,
      prev_command_path: 'file:path',
    }]  // End  of fields
  }, {
    name: 'Find files',
    command: 'find_files2json',
    fields: [{
      name: 'filename',
      visibility: 'server',
      description: 'File name to find',
      type: 'string',
      mandatory: true,
      prev_command_path: 'file_name',
      }, {
      name: 'toppath',
      visibility: 'server',
      description: 'Top level folder to search on',
      type: 'folder',
      mandatory: true,
      prev_command_path: 'top_path',
    }]  // End  of fields
  }, {
    name: 'Canopy Cover',
    description: 'Calculate canopy cover on images',
    algorithm: 'RGBA Plot',
    command: 'canopycover',
    fields: [{
      name: 'experimentdata',
      visibility: 'ui',
      prompt: 'Experiment file',
      description: 'YAML file containing experiment data',
      type: 'file',
      mandatory: false,
      }, {
      name: 'foundjsonfile',
      visibility: 'server',
      description: 'JSON file containing information on files to process',
      type: 'file',
      mandatory: true,
      prev_command_path: 'found_json_file',
      }, {
      name: 'resultssearchfolder',
      visibility: 'server',
      description: 'Search path as it appears in the results',
      type: 'string',
      mandatory: true,
      prev_command_path: 'results_search_folder',
    }]  // End  of fields
  }, {
    name: 'Merge CSV',
    command: 'merge_csv',
    fields: [{
      name: 'toppath',
      visibility: 'server',
      description: 'Top level folder to search on',
      type: 'folder',
      mandatory: true,
      prev_command_path: 'top_path',
    }]  // End  of fields
  }]  // End of steps
}];

export default workflowDefinitions;
