export const initDropdown=function () {
    const initCheckboxDropdown = (el) => {
      let isOpen = false;
      let areAllChecked = false;
  
      const label = el.querySelector('.dropdown-label');
      const checkAll = el.querySelector('[data-toggle="check-all"]');
      const inputs = Array.from(el.querySelectorAll('input[type="checkbox"]'));
  
      const updateStatus = () => {
        const checked = inputs.filter(input => input.checked);
        areAllChecked = false;
        checkAll.textContent = 'Check All';
  
        if (checked.length === 0) {
          label.textContent = 'Select Sites to display on graph';
        } else if (checked.length === 1) {
          const labelText = checked[0].closest('label')?.textContent.trim() || '1 Selected';
          label.textContent = labelText;
        } else if (checked.length === inputs.length) {
          label.textContent = 'All Selected';
          areAllChecked = true;
          checkAll.textContent = 'Uncheck All';
        } else {
          label.textContent = `${checked.length} Selected`;
        }
      };
  
      const setAll = (checked) => {
        inputs.forEach(input => input.checked = checked);
      };
  
      const toggleAll = () => {
        if (!areAllChecked) {
          setAll(true);
          areAllChecked = true;
          checkAll.textContent = 'Uncheck All';
        } else {
          setAll(false);
          areAllChecked = false;
          checkAll.textContent = 'Check All';
        }
        updateStatus();
      };
  
      const toggleOpen = (forceOpen = false) => {
        if (!isOpen || forceOpen) {
          isOpen = true;
          el.classList.add('on');
  
          const onOutsideClick = (e) => {
            if (!el.contains(e.target)) {
              isOpen = false;
              el.classList.remove('on');
              document.removeEventListener('click', onOutsideClick);
            }
          };
  
          setTimeout(() => document.addEventListener('click', onOutsideClick), 0);
        } else {
          isOpen = false;
          el.classList.remove('on');
        }
      };
  
      // Initial setup
      updateStatus();
  
      // Event listeners
      label.addEventListener('click', (e) => {
        e.preventDefault();
        toggleOpen();
      });
  
      checkAll.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAll();
      });
  
      inputs.forEach(input => {
        input.addEventListener('change', updateStatus);
      });
    };
  
    // Initialize all dropdowns
    const dropdowns = document.querySelectorAll('[data-control="checkbox-dropdown"]');
    dropdowns.forEach(initCheckboxDropdown);
  }
  