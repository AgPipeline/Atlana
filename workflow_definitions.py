"""Contains workflow definitions"""

WORKFLOW_DEFINTIONS = [
{
  'name': 'Canopy Cover',
  'description': 'Plot level canopy cover calculation',
  'id': 1,
  'steps': [{
    'name': 'Mask Soil on Image',
    'description': 'Masks soil from a copy of an image',
    'algorithm': 'RGBA File',
    'command': 'soilmask',
    'fields': [{
      'name': 'image',
      'visibility':  'ui',
      'prompt': 'Image file',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
    }]  # End  of fields
  }, {
    'name': 'Plot Clip',
    'description': 'Clips image to plot',
    'algorithm': 'RGBA File',
    'command': 'plotclip',
    'fields': [{
      'name': 'geometries',
      'visibility': 'ui',
      'prompt': 'GeoJSON file',
      'description': 'GeoJSON file containing plot geometries',
      'type': 'file',
      'mandatory': True,
    }]  # End  of fields
  }, {
    'name': 'Find files',
    'command': 'find_files2json',
  }, {
    'name': 'Canopy Cover',
    'description': 'Calculate canopy cover on images',
    'algorithm': 'RGBA Plot',
    'command': 'canopycover',
    'fields': [{
      'name': 'Experiment data',
      'visibility': 'ui',
      'prompt': 'Experiment file',
      'description': 'YAML file containing experiment data',
      'type': 'file',
      'mandatory': False,
    }]  # End  of fields
  }, {
    'name': 'Merge CSV',
    'command': 'merge_csv',
  }]  # End of steps
}, {
  'name': 'Ratio Canopy Cover',
  'description':  'Plot level canopy cover calculation using a ratio-based soil mask',
  'id': 2,
  'steps': [{
    'name': 'Mask Soil on Image',
    'description': 'Masks soil from a copy of an image using a green-to-red ratio',
    'algorithm': 'RGBA File',
    'command': 'soilmask_ratio',
    'fields': [{
      'name': 'image',
      'visibility':  'ui',
      'prompt': 'Image',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
    }, {
      'name': 'ratio',
      'visibility': 'ui',
      'prompt': 'Ratio',
      'description': 'Lower bound of green:red ratio for non-soil pixels',
      'type': 'float',
      'lowerbound': 0.0,
      'upperbound': 5.0,
      'default': 1.0,
    }]  # End  of fields
  }, {
    'name': 'Find files',
    'command': 'find_files2json',
  }, {
    'name': 'Plot Clip',
    'description': 'Clips image to plot',
    'algorithm': 'RGBA File',
    'command': 'plotclip',
    'fields': [{
      'name': 'geometries',
      'visibility': 'ui',
      'prompt': 'GeoJSON',
      'description': 'GeoJSON file containing plot geometries',
      'type': 'file',
      'mandatory': True,
    }]  # End  of fields
  }, {
    'name': 'Canopy Cover',
    'description': 'Calculate canopy cover on images',
    'algorithm': 'RGBA Plot',
    'command': 'canopycover',
    'fields': [{
      'name': 'Experiment data',
      'visibility': 'ui',
      'prompt': 'Experiment file',
      'description': 'YAML file containing experiment data',
      'type': 'file',
      'mandatory': False,
    }]  # End  of fields
  }, {
    'name': 'Merge CSV',
    'command': 'merge_csv',
  }]  # End of steps
}
]