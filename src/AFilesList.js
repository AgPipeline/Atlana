// Implementation of file & folder listing
import { Component } from 'react';
import './AFilesList.css';

// The order of these fields is important, see titleSortInd() and title_sort_map
var file_display_titles = ['Name', 'Timestamp', 'Size'];
var sort_column_id = {
  name: 1,
  date: 2,
  size: 3,
};
// Map the index of a title to the sort_column_id
var title_sort_map = {0: sort_column_id.name, 1: sort_column_id.date, 2: sort_column_id.size};

class AFilesList extends Component {
  constructor(props) {
    super(props);

    this.displayPathItem = this.displayPathItem.bind(this);
    this.sortByDate = this.sortByDate.bind(this);
    this.sortByName = this.sortByName.bind(this);
    this.sortResults = this.sortResults.bind(this);
    this.sortBySize = this.sortBySize.bind(this);
    this.titleClicked = this.titleClicked.bind(this);
    this.titleSortInd = this.titleSortInd.bind(this);
    
    let cur_contents = this.sortResults(this.props.contents, sort_column_id.name, true);
    const found_item = cur_contents.find((item) => item.path === this.props.path);
    let cur_is_file = false;
    if (found_item) {
      cur_is_file = found_item.type === 'file';
    }

    this.state = {
      cur_path: this.props.path,          // The working path
      is_file: cur_is_file,               // Flag for selection being a file or not
      sort_column: sort_column_id.name,   // Current column being sorted on
      sort_ascending: true,               // Flag for sort direction
      path_contents: cur_contents,        // Folder contents
    };
  }

  componentDidUpdate(prev_props) {
    if ((prev_props.path !== this.props.path) || ((prev_props.contents === null) && (this.props.contents !== null))) {
      const cur_item = this.props.contents.find((item) => item.path === this.props.path);
      const is_path = (this.props.contents.length > 0) && (this.props.contents[0].path.startsWith(this.props.path) && (this.props.contents[0].path[this.props.path.length] === '/'));
      const cur_is_file = (!is_path) || (cur_item && cur_item.hasOwnProperty('type') && cur_item['type'] === 'file' ? true : false);
      this.setState({cur_path: this.props.path, is_file: cur_is_file,
                     path_contents: this.sortResults(this.props.contents, this.state.sort_column, this.state.sort_ascending)});
    }
  }

  displayPathItem(item, idx) {
    const item_class_name = item.type ==='file' ? 'files-list-display-file' : 'files-list-display-folder';
    const image_source = item.type ==='file' ? 'file_image.png' : 'folder_image.png';
    const click_cb = item.type ==='file' ?  () => this.props.file_sel(item.path) : () => this.props.folder_sel(item.path);
    const item_size = item.type ==='file' ? item.size : '';

    return (
      <tr className="files-list-display-item-row" key={'row_' + item.name} >
        <td id={'files_list_' + idx + '_display-item-wrapper'} className="files-list-path-item" onClick={click_cb}>
          <div className="files-list-display-file-wrapper">
            <img src={image_source} alt=""/>
            <div id={idx + '_' + item.name} key={item.name} className={'files-list-path-display-item ' + item_class_name}>{item.name}</div>
          </div>
        </td>
        <td id={'files_list_' + idx + '_display_item_date'} className="files-list-path-item files-list-display-date">
          {item.date}
        </td>
        <td id={'files_list_' + idx + '_display_item_size'} className="files-list-path-item files-list-display-size">
          {item_size}
        </td>
      </tr>
    );
  }

  sortByDate(first, second, sort_asc) {
    // Handle empty dates by putting them at the end
    if (first.date.length <= 0) {
      return second.date.length > 0 ? (sort_asc ? 1 : -1) : 0;
    } else if (second.date.length <= 0) {
      return (sort_asc ? -1 : 1);
    }

    const first_parts = first.date.replace(' ', '-').replace(':', '-').split('-');
    const second_parts = second.date.replace(' ', '-').replace(':', '-').split('-');

    // Return at the first sign of differences
    for (let ii = 0; ii < first_parts.length; ii++) {
      // Proceed with date comparisons
      if (ii < second_parts.length) {
        if (first_parts[ii] < second_parts[ii]) {
          return sort_asc ? -1 : 1;
        } else if (first_parts[ii] > second_parts[ii]) {
          return sort_asc ? 1 : -1;
        }
      } else {
        // For some reason the second date has fewer parts
        return 1;
      }
    }

    // So far the timestamps are equal
    return first_parts === second_parts ? 0 : -1;
  }

  sortByName(first, second, sort_asc) {
    const lf = first['lower_name'];
    const ls = second['lower_name'];

    if (lf < ls) {
      return sort_asc ? -1 : 1;
    }
    else if (lf > ls) {
      return sort_asc ? 1 : -1;
    }
    else return 0;
  }

  sortResults(results, sort_column, sort_ascending) {
    const sort_asc = !(sort_ascending === false);   // Normalize for missing or non-boolean value

    switch (sort_column) {
      default:
      case sort_column_id.name:
        return results.sort((first, second) => this.sortByName(first, second, sort_asc));

      case sort_column_id.size:
        return results.sort((first, second) => this.sortBySize(first, second, sort_asc));

      case sort_column_id.date:
        return results.sort((first, second) => this.sortByDate(first, second, sort_asc));
    } 
  }

  sortBySize(first, second, sort_asc) {
    // Sort so that folders are at the end, sort folders by name
    if (first.type === 'folder') {
      if (second.type === 'folder') {
        return this.sortByName(first, second, sort_asc);
      } else {
        return sort_asc ? 1 : -1;
      }
    } else if (second.type === 'folder') {
      return sort_asc ? -1 : 1;
    } else {
      if (parseInt(first.size) === parseInt(second.size)) {
        return 0;
      } else if (first.size < second.size) {
        return sort_asc ? -1 : 1;
      } else {
        return sort_asc ? 1 : -1;
      }
    }
  }

  titleClicked(ev, title) {
    const found_idx = file_display_titles.findIndex((item) => item === title);

    if (found_idx >= 0) {
      if (this.state.sort_column === title_sort_map[found_idx]) {
        const sorted_results = this.sortResults(this.state.path_contents, this.state.sort_column, !this.state.sort_ascending);
        this.setState({sort_ascending: !this.state.sort_ascending, path_contents: sorted_results});
      } else {
        const sorted_results = this.sortResults(this.state.path_contents, title_sort_map[found_idx], true);
        this.setState({sort_column: title_sort_map[found_idx], sort_ascending: true, path_contents: sorted_results})
      }
    }
  }

  titleSortInd(title, sort_asc) {
    const found_idx = file_display_titles.findIndex((item) => item === title);

    if (found_idx >= 0) {
      if (this.state.sort_column === title_sort_map[found_idx]) {
        if (sort_asc) {
          return "\u2227";  // Up caret
        } else {
          return "\u2228";  // Down caret
        }
      }
    }

    return " ";
  }

  render() {
    let parent_el = document.getElementById(this.props.parent_id);
    if (!parent_el) {
      return null;
    }

    var display_style = {};
    const client_rect = parent_el.getBoundingClientRect();

    display_style['left'] = client_rect.x;
    display_style['top'] = client_rect.y;
    display_style['width'] = client_rect.width;
    display_style['height'] = client_rect.height;

    let folder_navigation = null;
    if (this.state.cur_path !== '/' && (this.state.is_file === false)) {
      folder_navigation = [{
        name: '..', path: '..', type: 'folder'
      }]
    }

    return (
      <div id="files_list_contents_table_wrapper" className="files-list-contents-table-wrapper">
        <table id="files_list_contents_table" className="files-list-contents-table">
          <thead>
            <tr>
              {file_display_titles.map((title, idx) => {
                  let indicator = this.titleSortInd(title, this.state.sort_ascending);
                  return(<th key={'files_list_contents_table_' + title} className="files-list-contents-table-header">
                      <div id={'files_list_contents_table_title_wrapper_' + title} className="files-list-contents-table-title-wrapper" 
                           onClick={(ev) => this.titleClicked(ev, title)}>
                        <div id={'files_list_contents_table_title_text_' + idx} className="files-list-contents-table-title-text" >{title}</div>
                        <div id={'files_list_contents_table_title_ind_' + idx} 
                             className="files-list-contents-table-title-indicator" >{indicator}</div>
                      </div>
                    </th>
                  );
              })}
            </tr>
          </thead>
          <tbody>
              {folder_navigation && folder_navigation.map(this.displayPathItem)}
              {this.state.path_contents && this.state.path_contents.map(this.displayPathItem)}
          </tbody>
        </table>
      </div>
    );
  }
}

export default AFilesList;
